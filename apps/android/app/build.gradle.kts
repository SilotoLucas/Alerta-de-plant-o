plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.silotolucas.alertaplantao"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.silotolucas.alertaplantao"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "2.0"
        // Apps cujas notificacoes viram alerta (WhatsApp normal e Business).
        buildConfigField("String", "PACOTES_ALVO", "\"com.whatsapp,com.whatsapp.w4b\"")
        // Endereco da API que o app ja traz preenchido (so aparece em "Avancado"). Em vazio, o
        // campo fica a mostra. Gere com: ./gradlew assembleRelease -Pservidor=https://alerta.exemplo.com
        buildConfigField("String", "SERVIDOR_PADRAO", "\"${project.findProperty("servidor") ?: ""}\"")
    }

    buildTypes {
        debug {
            // No debug, o app do shell tambem vale: permite testar com `adb shell cmd notification post`.
            buildConfigField("String", "PACOTES_ALVO", "\"com.whatsapp,com.whatsapp.w4b,com.android.shell\"")
            // No emulador, o computador que roda a API e o 10.0.2.2.
            buildConfigField("String", "SERVIDOR_PADRAO", "\"${project.findProperty("servidor") ?: "http://10.0.2.2:3350"}\"")
        }
        release {
            isMinifyEnabled = false
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets["main"].java.srcDir("src/main/kotlin")
    sourceSets["test"].java.srcDir("src/test/kotlin")
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.work:work-runtime-ktx:2.10.3")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
