// Banner.cs - cartao de alerta e brilho nas bordas da tela (compilado em tempo de execucao pelo AlertaPlantao.ps1).
// C# 5 (compilador do .NET Framework): sem interpolacao de string, sem "?.".
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace AP
{
    public static class Native
    {
        [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
        [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
        [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
        [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int val, int size);
        [StructLayout(LayoutKind.Sequential)] public struct MARGINS { public int l, r, t, b; }
        [DllImport("dwmapi.dll")] public static extern int DwmExtendFrameIntoClientArea(IntPtr h, ref MARGINS m);

        [StructLayout(LayoutKind.Sequential)] public struct POINT { public int x, y; }
        [StructLayout(LayoutKind.Sequential)] public struct SIZE { public int cx, cy; }
        [StructLayout(LayoutKind.Sequential, Pack = 1)] public struct BLENDFUNCTION { public byte op, flags, alpha, format; }
        [DllImport("user32.dll")] public static extern bool UpdateLayeredWindow(IntPtr hwnd, IntPtr hdcDst, ref POINT pptDst, ref SIZE psize, IntPtr hdcSrc, ref POINT pptSrc, int crKey, ref BLENDFUNCTION pblend, int flags);
        [DllImport("user32.dll", EntryPoint = "UpdateLayeredWindow")] public static extern bool UpdateLayeredWindowAlpha(IntPtr hwnd, IntPtr hdcDst, IntPtr pptDst, IntPtr psize, IntPtr hdcSrc, IntPtr pptSrc, int crKey, ref BLENDFUNCTION pblend, int flags);
        [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr h);
        [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr h, IntPtr dc);
        [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr dc);
        [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr dc);
        [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr dc, IntPtr obj);
        [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr obj);

        public static GraphicsPath RoundRect(RectangleF r, float rad)
        {
            GraphicsPath p = new GraphicsPath();
            float d = rad * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90);
            p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure();
            return p;
        }

        // Icone da bandeja: circulo colorido com um sino branco.
        public static Icon MakeIcon(Color c)
        {
            Bitmap bmp = new Bitmap(32, 32);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                using (SolidBrush b = new SolidBrush(c)) g.FillEllipse(b, 1, 1, 30, 30);
                string fontName = FontExists("Segoe Fluent Icons") ? "Segoe Fluent Icons" : "Segoe MDL2 Assets";
                using (Font f = new Font(fontName, 15f, FontStyle.Regular, GraphicsUnit.Pixel))
                using (StringFormat sf = new StringFormat())
                {
                    sf.Alignment = StringAlignment.Center; sf.LineAlignment = StringAlignment.Center;
                    g.DrawString("", f, Brushes.White, new RectangleF(0, 1, 32, 32), sf);
                }
            }
            return Icon.FromHandle(bmp.GetHicon());
        }

        static bool FontExists(string name)
        {
            using (Font f = new Font(name, 10f)) return f.Name == name;
        }
    }

    // Brilho verde nas bordas de uma tela: janela transparente, que nao recebe clique nem foco, e pulsa devagar.
    public class Glow : Form
    {
        Bitmap bmp;
        Timer pulse;
        double phase;

        public Glow(Rectangle bounds, Color c, int depth)
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            Bounds = bounds;
            bmp = Build(bounds.Width, bounds.Height, c, depth);
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                // LAYERED | TRANSPARENT (clique passa) | TOOLWINDOW | TOPMOST | NOACTIVATE
                cp.ExStyle |= 0x80000 | 0x20 | 0x80 | 0x8 | 0x08000000;
                return cp;
            }
        }

        static Bitmap Build(int w, int h, Color c, int depth)
        {
            Bitmap b = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            BitmapData data = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            int[] px = new int[w * h];
            int rgb = (c.R << 16) | (c.G << 8) | c.B;
            for (int y = 0; y < h; y++)
            {
                int dy = Math.Min(y, h - 1 - y);
                for (int x = 0; x < w; x++)
                {
                    int d = Math.Min(dy, Math.Min(x, w - 1 - x));
                    if (d >= depth) { x = Math.Max(x, w - depth - 1); continue; }   // pula o miolo da tela
                    double t = 1.0 - (double)d / depth;
                    int a = (int)(210 * t * t * t);
                    px[y * w + x] = (a << 24) | rgb;
                }
            }
            Marshal.Copy(px, 0, data.Scan0, px.Length);
            b.UnlockBits(data);
            return b;
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            DesenharBrilho(0);
        }

        void DesenharBrilho(byte alpha)
        {
            IntPtr screen = Native.GetDC(IntPtr.Zero);
            IntPtr mem = Native.CreateCompatibleDC(screen);
            IntPtr hb = bmp.GetHbitmap(Color.FromArgb(0));
            IntPtr old = Native.SelectObject(mem, hb);
            try
            {
                Native.POINT dst = new Native.POINT(); dst.x = Left; dst.y = Top;
                Native.SIZE sz = new Native.SIZE(); sz.cx = bmp.Width; sz.cy = bmp.Height;
                Native.POINT src = new Native.POINT();
                Native.BLENDFUNCTION bf = new Native.BLENDFUNCTION(); bf.op = 0; bf.flags = 0; bf.alpha = alpha; bf.format = 1;
                Native.UpdateLayeredWindow(Handle, screen, ref dst, ref sz, mem, ref src, 0, ref bf, 2);
            }
            finally
            {
                Native.SelectObject(mem, old); Native.DeleteObject(hb);
                Native.DeleteDC(mem); Native.ReleaseDC(IntPtr.Zero, screen);
            }
        }

        void SetAlpha(byte alpha)
        {
            Native.BLENDFUNCTION bf = new Native.BLENDFUNCTION(); bf.op = 0; bf.flags = 0; bf.alpha = alpha; bf.format = 1;
            Native.UpdateLayeredWindowAlpha(Handle, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0, ref bf, 2);
        }

        public void Start()
        {
            Show();
            phase = 0;
            pulse = new Timer(); pulse.Interval = 30;
            pulse.Tick += delegate
            {
                phase += 0.03;
                double fadeIn = Math.Min(1.0, phase / 0.5);
                double wave = 0.62 + 0.38 * Math.Sin(phase * 2.6 - Math.PI / 2);   // pulsa ~ a cada 2,4 s
                SetAlpha((byte)(255 * fadeIn * wave));
            };
            pulse.Start();
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            if (pulse != null) pulse.Stop();
            if (bmp != null) { bmp.Dispose(); bmp = null; }
            base.OnFormClosed(e);
        }
    }

    public class Conversa
    {
        public string Titulo, Corpo, Hora;
        public int Qtd;
    }

    public class Banner : Form
    {
        public event EventHandler Dismissed;

        readonly List<Conversa> conversas = new List<Conversa>();
        readonly List<Glow> glows = new List<Glow>();
        int total;
        float s;
        bool hoverBtn, hoverX;
        RectangleF btnRect, xRect;
        Timer anim;
        int animStep, startY, endY;
        const int MaxLinhas = 4;

        static readonly Color Bg      = Color.FromArgb(17, 27, 33);
        static readonly Color Bg2     = Color.FromArgb(32, 44, 51);
        public static readonly Color Accent = Color.FromArgb(37, 211, 102);
        static readonly Color TextHi  = Color.FromArgb(233, 237, 239);
        static readonly Color TextLo  = Color.FromArgb(160, 172, 178);
        static readonly Color Linha   = Color.FromArgb(44, 58, 66);
        static readonly Color[] Avatares = {
            Color.FromArgb(0, 168, 132), Color.FromArgb(83, 189, 235), Color.FromArgb(255, 152, 0),
            Color.FromArgb(171, 71, 188), Color.FromArgb(239, 83, 80), Color.FromArgb(38, 166, 154) };

        public Banner(float largura)
        {
            using (Graphics g = CreateGraphics()) s = g.DpiX / 96f;
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false; TopMost = true; KeyPreview = true;
            StartPosition = FormStartPosition.Manual;
            DoubleBuffered = true; BackColor = Bg;
            Size = new Size(S(largura), S(128));
            Cursor = Cursors.Hand;
            Text = "Alerta de Plantao";
        }

        int S(float v) { return (int)Math.Round(v * s); }

        public int Total { get { return total; } }
        public int Conversas { get { return conversas.Count; } }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= 0x80 | 0x8;   // WS_EX_TOOLWINDOW (fora do Alt+Tab) | WS_EX_TOPMOST
                return cp;
            }
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try
            {
                int v = 2; Native.DwmSetWindowAttribute(Handle, 2, ref v, 4);    // sombra do DWM
                Native.MARGINS m = new Native.MARGINS(); m.l = m.r = m.t = m.b = 1;
                Native.DwmExtendFrameIntoClientArea(Handle, ref m);
                int round = 2; Native.DwmSetWindowAttribute(Handle, 33, ref round, 4); // cantos arredondados (Win 11)
            }
            catch { }
        }

        // Agrupa por conversa (titulo); a conversa mais recente vai para o topo.
        public void AddMessage(string titulo, string corpo, string hora)
        {
            titulo = string.IsNullOrEmpty(titulo) ? "WhatsApp" : titulo;
            Conversa c = conversas.Find(delegate (Conversa x) { return x.Titulo == titulo; });
            if (c == null) { c = new Conversa(); c.Titulo = titulo; }
            else conversas.Remove(c);
            c.Corpo = corpo ?? ""; c.Hora = hora ?? ""; c.Qtd++;
            conversas.Insert(0, c);
            total++;
            Relayout();
            Invalidate();
        }

        void Relayout()
        {
            int h;
            if (conversas.Count <= 1) h = S(128);
            else
            {
                int linhas = Math.Min(conversas.Count, MaxLinhas);
                int extra = conversas.Count > MaxLinhas ? 1 : 0;
                h = S(46) + linhas * S(60) + extra * S(24) + S(58);
            }
            if (Height != h) Height = h;
        }

        public void Present(bool pegarFoco, bool brilho)
        {
            if (brilho)
            {
                foreach (Screen sc in Screen.AllScreens)
                {
                    Glow g = new Glow(sc.Bounds, Accent, S(46));
                    glows.Add(g);
                    g.Start();
                }
            }
            Rectangle wa = Screen.PrimaryScreen.WorkingArea;
            int x = wa.Left + (wa.Width - Width) / 2;
            endY = wa.Top + S(14);
            startY = wa.Top - Height;
            Location = new Point(x, startY);
            Show();
            if (pegarFoco)
            {
                Native.keybd_event(0x12, 0, 0, UIntPtr.Zero); Native.keybd_event(0x12, 0, 2, UIntPtr.Zero);
                Native.SetForegroundWindow(Handle);
                Activate();
            }
            animStep = 0;
            anim = new Timer(); anim.Interval = 15;
            anim.Tick += delegate
            {
                animStep++;
                double t = Math.Min(1.0, animStep / 14.0);
                double ease = 1 - Math.Pow(1 - t, 3);
                Top = (int)(startY + (endY - startY) * ease);
                if (t >= 1.0) anim.Stop();
            };
            anim.Start();
        }

        public void Dismiss()
        {
            if (anim != null) anim.Stop();
            EventHandler h = Dismissed;
            if (h != null) h(this, EventArgs.Empty);
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            foreach (Glow g in glows) { g.Close(); g.Dispose(); }
            glows.Clear();
            base.OnFormClosed(e);
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Enter || keyData == Keys.Escape || keyData == Keys.Space) { Dismiss(); return true; }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        protected override void OnMouseClick(MouseEventArgs e) { base.OnMouseClick(e); Dismiss(); }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            bool hb = btnRect.Contains(e.Location), hx = xRect.Contains(e.Location);
            if (hb != hoverBtn || hx != hoverX) { hoverBtn = hb; hoverX = hx; Invalidate(); }
        }

        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); hoverBtn = hoverX = false; Invalidate(); }

        static string Iniciais(string t)
        {
            string r = "";
            foreach (string w in t.Split(new[] { ' ', '-', '_', '|' }, StringSplitOptions.RemoveEmptyEntries))
            {
                foreach (char ch in w) { if (char.IsLetterOrDigit(ch)) { r += char.ToUpper(ch); break; } }
                if (r.Length == 2) break;
            }
            return r.Length == 0 ? "?" : r;
        }

        void DrawAvatar(Graphics g, Conversa c, RectangleF av, float fontPt)
        {
            Color avc = Avatares[Math.Abs(c.Titulo.GetHashCode()) % Avatares.Length];
            using (SolidBrush b = new SolidBrush(avc)) g.FillEllipse(b, av);
            using (Font f = new Font("Segoe UI Semibold", fontPt))
            using (StringFormat sf = new StringFormat())
            {
                sf.Alignment = StringAlignment.Center; sf.LineAlignment = StringAlignment.Center;
                g.DrawString(Iniciais(c.Titulo), f, Brushes.White, av, sf);
            }
            if (c.Qtd > 1)
            {
                string n = c.Qtd > 99 ? "99+" : c.Qtd.ToString();
                RectangleF bd = new RectangleF(av.Right - S(15), av.Top - S(6), S(n.Length > 1 ? 26 : 20), S(20));
                using (GraphicsPath p = Native.RoundRect(bd, S(10)))
                {
                    using (SolidBrush b = new SolidBrush(Accent)) g.FillPath(b, p);
                    using (Pen pen = new Pen(Bg2, S(2))) g.DrawPath(pen, p);
                }
                using (Font f = new Font("Segoe UI", 8f, FontStyle.Bold))
                using (StringFormat sf = new StringFormat())
                using (SolidBrush tb = new SolidBrush(Bg))
                {
                    sf.Alignment = StringAlignment.Center; sf.LineAlignment = StringAlignment.Center;
                    g.DrawString(n, f, tb, bd, sf);
                }
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
            float W = Width, H = Height;

            using (LinearGradientBrush bg = new LinearGradientBrush(new RectangleF(0, 0, W, H), Bg2, Bg, 90f))
                g.FillRectangle(bg, 0, 0, W, H);
            using (SolidBrush a = new SolidBrush(Accent)) g.FillRectangle(a, 0, 0, S(5), H);
            if (conversas.Count == 0) return;

            StringFormat one = new StringFormat(StringFormatFlags.NoWrap);
            one.Trimming = StringTrimming.EllipsisCharacter;

            if (conversas.Count == 1)
            {
                // ---- uma conversa: layout grande ----
                Conversa c = conversas[0];
                DrawAvatar(g, c, new RectangleF(S(22), S(22), S(46), S(46)), 13f);
                float tx = S(84), tw = W - tx - S(44);
                using (Font f = new Font("Segoe UI", 7.5f, FontStyle.Bold))
                using (SolidBrush b = new SolidBrush(Accent))
                    g.DrawString("WHATSAPP  •  PLANTÃO  •  " + c.Hora, f, b, new RectangleF(tx, S(16), tw, S(18)), one);
                using (Font f = new Font("Segoe UI Semibold", 11.5f))
                using (SolidBrush b = new SolidBrush(TextHi))
                    g.DrawString(c.Titulo, f, b, new RectangleF(tx, S(33), tw, S(26)), one);
                using (StringFormat multi = new StringFormat())
                {
                    multi.Trimming = StringTrimming.EllipsisWord;
                    using (Font f = new Font("Segoe UI", 9.5f))
                    using (SolidBrush b = new SolidBrush(TextLo))
                        g.DrawString(c.Corpo, f, b, new RectangleF(tx, S(58), W - tx - S(130), S(40)), multi);
                }
            }
            else
            {
                // ---- varias conversas: lista ----
                string head = "WHATSAPP  •  PLANTÃO  •  " + conversas.Count + " CONVERSAS  •  " + total + " MENSAGENS";
                using (Font f = new Font("Segoe UI", 7.5f, FontStyle.Bold))
                using (SolidBrush b = new SolidBrush(Accent))
                    g.DrawString(head, f, b, new RectangleF(S(22), S(16), W - S(70), S(18)), one);

                int linhas = Math.Min(conversas.Count, MaxLinhas);
                float y0 = S(42);
                for (int i = 0; i < linhas; i++)
                {
                    Conversa c = conversas[i];
                    float y = y0 + i * S(60);
                    if (i == 0)
                        using (SolidBrush hl = new SolidBrush(Color.FromArgb(14, 255, 255, 255)))
                        using (GraphicsPath p = Native.RoundRect(new RectangleF(S(12), y + S(2), W - S(24), S(56)), S(10)))
                            g.FillPath(hl, p);
                    DrawAvatar(g, c, new RectangleF(S(22), y + S(10), S(40), S(40)), 11f);
                    float tx = S(76);
                    using (Font f = new Font("Segoe UI Semibold", 10.5f))
                    using (SolidBrush b = new SolidBrush(TextHi))
                        g.DrawString(c.Titulo, f, b, new RectangleF(tx, y + S(8), W - tx - S(78), S(24)), one);
                    using (Font f = new Font("Segoe UI", 8f))
                    using (SolidBrush b = new SolidBrush(i == 0 ? Accent : TextLo))
                    using (StringFormat far = new StringFormat(StringFormatFlags.NoWrap))
                    {
                        far.Alignment = StringAlignment.Far;
                        g.DrawString(c.Hora, f, b, new RectangleF(W - S(78), y + S(11), S(56), S(18)), far);
                    }
                    using (Font f = new Font("Segoe UI", 9f))
                    using (SolidBrush b = new SolidBrush(TextLo))
                        g.DrawString(c.Corpo, f, b, new RectangleF(tx, y + S(32), W - tx - S(24), S(20)), one);
                    if (i < linhas - 1)
                        using (Pen p = new Pen(Linha, 1)) g.DrawLine(p, tx, y + S(60), W - S(22), y + S(60));
                }
                if (conversas.Count > MaxLinhas)
                {
                    int resto = conversas.Count - MaxLinhas;
                    using (Font f = new Font("Segoe UI", 8.5f, FontStyle.Italic))
                    using (SolidBrush b = new SolidBrush(TextLo))
                        g.DrawString("+ " + resto + (resto == 1 ? " outra conversa" : " outras conversas"), f, b,
                            new RectangleF(S(76), y0 + linhas * S(60) + S(2), W - S(100), S(20)), one);
                }
            }
            one.Dispose();

            // botao OK
            btnRect = new RectangleF(W - S(118), H - S(46), S(100), S(32));
            using (GraphicsPath p = Native.RoundRect(btnRect, S(16)))
            using (SolidBrush b = new SolidBrush(hoverBtn ? Color.FromArgb(74, 222, 128) : Accent))
                g.FillPath(b, p);
            using (Font f = new Font("Segoe UI Semibold", 9.5f))
            using (StringFormat sf = new StringFormat())
            using (SolidBrush tb = new SolidBrush(Bg))
            {
                sf.Alignment = StringAlignment.Center; sf.LineAlignment = StringAlignment.Center;
                g.DrawString("OK  ↵", f, tb, btnRect, sf);
            }
            using (Font f = new Font("Segoe UI", 7.5f))
            using (SolidBrush b = new SolidBrush(Color.FromArgb(110, 125, 132)))
            using (StringFormat sf = new StringFormat())
            {
                sf.Alignment = StringAlignment.Far;
                g.DrawString("Enter ou Esc", f, b, new RectangleF(W - S(230), H - S(38), S(104), S(18)), sf);
            }

            // X
            xRect = new RectangleF(W - S(38), S(10), S(26), S(26));
            if (hoverX) using (SolidBrush b = new SolidBrush(Color.FromArgb(50, 255, 255, 255))) g.FillEllipse(b, xRect);
            using (Pen p = new Pen(hoverX ? TextHi : TextLo, S(1.6f)))
            {
                float c = S(8);
                g.DrawLine(p, xRect.Left + c, xRect.Top + c, xRect.Right - c, xRect.Bottom - c);
                g.DrawLine(p, xRect.Right - c, xRect.Top + c, xRect.Left + c, xRect.Bottom - c);
            }
        }
    }
}
