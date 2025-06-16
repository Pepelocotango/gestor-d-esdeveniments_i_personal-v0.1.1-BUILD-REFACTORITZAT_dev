### `README.md`**

# Gestor d'Esdeveniments i Personal v0.1.2_dev

Aplicació d'escriptori multiplataforma (construïda amb Electron, React i Vite) per a la gestió integral d'esdeveniments, personal i les seves assignacions. El projecte està actualment en fase de desenvolupament actiu.

## 💾 Descàrrega i Instal·lació

Pots descarregar l'última versió de l'aplicació directament des de la nostra secció de [**Releases a GitHub**](https://github.com/Pepelocotango/Gestor-Events_i_Personal/releases).

Cada versió inclou binaris compilats per a Windows, macOS i Linux. Assegura't de descarregar el fitxer correcte per al teu sistema operatiu.

### Requisits Mínims del Sistema

*   **Windows:** Windows 10 (64-bit) o superior.
*   **macOS:** macOS 10.15 (Catalina) o superior.
*   **Linux:** Ubuntu 18.04, Debian 10, Fedora 28 o qualsevol distribució equivalent o més recent.

### Instruccions per Plataforma

#### 🪟 **Windows**

Oferim dues versions per a Windows:

1.  **Instal·lador (`...-Installer.exe`):**
    *   **Recomanat per a la majoria d'usuaris.**
    *   Descarrega i executa el fitxer `.exe` que conté la paraula `Installer`.
    *   Això instal·larà l'aplicació al teu sistema, creant una drecera a l'escriptori i una entrada al menú d'inici per a un accés fàcil.

2.  **Versió Portable (`...-Portable.exe`):**
    *   **Ideal per executar sense instal·lar, per exemple des d'un pen-drive.**
    *   Descarrega el fitxer `.exe` que conté la paraula `Portable`.
    *   Pots executar l'aplicació directament amb un doble clic sense que s'instal·li res al teu sistema.

####  **macOS**

Per a macOS, la distribució es fa a través d'un fitxer `.dmg`:

*   Descarrega el fitxer `...-macOS-10.15+.dmg`.
*   Fes-hi doble clic per obrir-lo. S'obrirà una finestra del Finder.
*   Per instal·lar l'aplicació, simplement **arrossega la icona de l'aplicació a la drecera de la carpeta d'Aplicacions** que apareix a la mateixa finestra.
*   Ja pots executar l'aplicació des de la teva carpeta d'Aplicacions o mitjançant Launchpad.

> **Nota:** La primera vegada que obris l'aplicació, com que no està descarregada des de l'App Store, macOS podria mostrar un avís de seguretat.
Per obrir-la, fes clic dret sobre la icona de l'aplicació, selecciona "Obrir" i confirma l'acció al diàleg que apareixerà.
Si el pas anterior no funciona, prova de anar a preferències de sistema i donar-li permís d'execució a la App. ( gràcies Isaac!)

#### 🐧 **Linux**

Per a Linux, utilitzem el format `AppImage`, que no requereix instal·lació:

*   Descarrega el fitxer `...-Linux-Ubuntu18.04+.AppImage`.
*   **Dona-li permisos d'execució.** La manera més fàcil és fent clic dret sobre el fitxer > Propietats > Permisos > i marcar la casella "Permet executar el fitxer com un programa".
    *   Alternativament, des de la terminal: `chmod +x GestorEsdeveniments-*.AppImage`
*   Fes doble clic sobre el fitxer per executar l'aplicació.

---

### 📂 Fitxers d'Exemple

Per ajudar-te a començar, hem inclòs una carpeta anomenada `examples_json` amb fitxers de dades d'exemple que pots carregar a l'aplicació:

*   **`example_all.json`**: Un fitxer complet amb esdeveniments, personal i assignacions per veure totes les funcionalitats de l'aplicació en acció.
*   **`example_person.json`**: Un fitxer més senzill centrat en la gestió de la base de dades de persones.

Pots carregar aquests fitxers des de l'aplicació utilitzant el botó "Carregar dades" per familiaritzar-te amb l'estructura de dades.


## 🚀 Funcionalitats Clau

Aquesta eina està dissenyada per centralitzar la planificació i el seguiment de personal en múltiples esdeveniments, amb un enfocament en la claredat visual i la flexibilitat.

-   **Gestió d'Esdeveniments Marc:** Crear, editar i eliminar esdeveniments amb dates, lloc i notes generals.
-   **Gestió de Persones/Grups:** Base de dades centralitzada de contactes amb els seus detalls.
-   **Assignacions Detallades:**
    -   Assignació de persones a esdeveniments per rangs de dates.
    -   Estat per assignació (`Sí`, `No`, `Pendent`).
    -   **Estat Diari Individual:** Capacitat per definir un estat per a cada dia en assignacions de múltiples jornades (`Mixt`), amb fons i estils coherents.
-   **Visualització Avançada:**
    -   **Calendari Interactiu:** Múltiples vistes (multi-mes, mes, setmana, agenda) per a una planificació visual.
    -   **Llista Filtrable:** Llista d'esdeveniments amb filtres per text, lloc, persona, estat i data.
    -   **Auto-expansió Intel·ligent:** La llista mostra automàticament els resultats coincidents en aplicar un filtre, expandint els marcs i assignacions rellevants.
-   **Detecció de Conflictes Precisa:** El sistema avisa si una persona s'assigna a múltiples tasques **en un dia específic**, evitant falsos positius.
-   **Importació i Exportació:**
    -   Càrrega i desat de totes les dades en format JSON.
    -   Exportació de la vista filtrada actual a CSV.
    -   **Exportació Granular:** Exportació de resums específics (per persona, data o esdeveniment) a CSV des de cada grup de resum.
-   **Interfície d'Usuari:**
    -   Suport per a tema clar i fosc.
    -   Notificacions (toasts) per a les accions de l'usuari.
    -   Visualització detallada d'estats mixts, amb un desglossament per dia i colors representatius.

## 🛠️ Pila Tecnològica (Tech Stack)

-   **Electron:** `^29.4.6`
-   **Vite:** `^6.3.5`
-   **React:** `^18.3.1`
-   **TypeScript:** `~5.5.3`
-   **Tailwind CSS:** `^3.4.17`
-   **FullCalendar:** `^6.1.17`
-   **Electron Builder:** `^24.13.3`

## 🏗️ Arquitectura i Estructura del Projecte

El projecte segueix una arquitectura moderna de tres capes i una organització de fitxers clara per separar responsabilitats.

#### 1. Arquitectura General
-   **Procés Principal (Backend - Electron):** `main.cjs` s'encarrega de la lògica de l'aplicació nativa: gestió de finestres, menús, cicle de vida (amb desat segur abans de tancar) i accés segur al sistema de fitxers.
-   **Procés de Preload (Pont):** `preload.cjs` actua com un pont segur entre el món de Node.js (procés principal) i el món del navegador (frontend), exposant funcions controlades mitjançant `contextBridge`.
-   **Procés de Renderització (Frontend - React):** La interfície d'usuari, construïda amb React i Vite.
    -   **Gestió d'Estat Centralitzada:** El hook `useEventDataManager` actua com a única font de veritat per a les dades. `EventDataContext` distribueix aquest estat a tota l'aplicació.
    -   **Code Splitting:** `App.tsx` utilitza `React.lazy` per carregar components de manera asíncrona, optimitzant la càrrega inicial.

---

### 📁 Estructura i Responsabilitat dels Fitxers

#### 1. Fitxers de Configuració i Arrel del Projecte

Aquests fitxers defineixen el projecte, les seves dependències i com es construeix i s'executa.

*   **`package.json`**: El manifest del projecte. Defineix el nom, la versió, els scripts (`npm run dev`, `npm run build:electron`) i totes les dependències.
*   **`vite.config.ts`**: Configuració de **Vite**. Defineix com es compila i s'empaqueta el codi React per al *renderer* d'Electron.
*   **`tailwind.config.cjs`**: El cor de l'estètica de l'aplicació. Configura **TailwindCSS**, defineix quins fitxers escanejar i conté el **plugin personalitzat** per aplicar els estils del tema fosc a FullCalendar.
*   **`postcss.config.cjs`**: Fitxer de configuració auxiliar per a **PostCSS**, utilitzat per Tailwind.
*   **`tsconfig.json`**: Configuració de **TypeScript**. Defineix les regles del llenguatge i la resolució de mòduls.
*   **`index.html`**: El punt d'entrada HTML de l'aplicació, una closca simple que carrega el CSS i el JS principals.

#### 2. Fitxers Principals d'Electron

Aquests fitxers converteixen l'aplicació web de React en una aplicació d'escriptori.

*   **`main.cjs`**: El **procés principal** d'Electron. És el backend de l'aplicació, responsable de crear la finestra, gestionar el menú nadiu, controlar el cicle de vida de l'app (incloent-hi el desat segur de dades en tancar) i gestionar la comunicació amb el sistema de fitxers.
*   **`preload.cjs`**: El **pont de comunicació segur** que exposa funcions del backend (com `saveAppData`) al frontend de manera controlada, utilitzant `contextBridge`.

#### 3. Codi Font de l'Aplicació (`src/`)

Aquesta carpeta conté tota la lògica i la interfície de l'aplicació React.

*   **Punt d'Entrada i Component Arrel:**
    *   `src/index.tsx`: Inicia l'aplicació React renderitzant el component `App` a l'element `#root` de l'`index.html`.
    *   `src/App.tsx`: Component pare de tota l'aplicació. Munta l'estructura general, gestiona el tema (clar/fosc), controla els modals, mostra notificacions i carrega dinàmicament (`React.lazy`) els components pesats.
    *   `src/index.css`: Full d'estils principal que importa les capes de Tailwind i defineix els estils personalitzats de l'aplicació.

*   **Dades i Lògica de Negoci:**
    *   `src/hooks/useEventDataManager.ts`: El "cervell" de l'aplicació. Hook personalitzat que centralitza tota la lògica per gestionar dades, incloent la **detecció de conflictes per dia**.
    *   `src/contexts/EventDataContext.tsx`: Proporciona accés a les dades i funcions del hook anterior a tota l'aplicació mitjançant el context de React.

*   **Definicions i Utilitats:**
    *   `src/types.ts`: Defineix totes les interfícies de dades (`EventFrame`, `Assignment`, etc.) amb TypeScript.
    *   `src/constants.tsx`: Lloc centralitzat per a valors constants i components d'icones SVG.
    *   `src/utils/`: Carpeta amb funcions d'ajuda genèriques:
        *   `dateFormat.ts`: Per a formatar dates.
        *   `dataMigration.ts`: Per a migrar dades de formats antics.
        *   `statusUtils.ts`: Lògica per generar el text descriptiu dels estats mixts.
        *   `dateRangeFormatter.ts`: Utilitat per agrupar llistes de dates en rangs compactes.

*   **Components de la Interfície (`src/components/`)**
    *   `Controls.tsx`: Panell de control superior amb botons per a la gestió de dades i configuració.
    *   `MainDisplay.tsx`: Orquestra la vista principal, gestionant filtres i l'**estat d'expansió automàtica** de la llista.
    *   `SummaryReports.tsx`: Component que genera i mostra els resums de dades, permetent l'**exportació granular** de cada grup a CSV.
    *   `EventFrameCard.tsx`: Component dedicat a renderitzar una única targeta d'esdeveniment marc.
    *   `AssignmentCard.tsx`: Component dedicat a renderitzar una única assignació, incloent la vista detallada per dies.
    *   `ui/Modal.tsx`: Component genèric i reutilitzable que serveix de base per a tots els diàlegs modals.
    *   `modals/`: Directori que conté cada modal en un fitxer separat, millorant l'organització.

## 🚀 Començar (Getting Started) MODE DEVELOPER

### Prerequisits

Assegura't de tenir instal·lat [Node.js](https://nodejs.org/) (versió 18 o superior) i `npm`.

### Instal·lació

1.  Clona el repositori.
2.  Navega al directori del projecte.
3.  Instal·la les dependències:
    ```sh
    npm install
    ```

### Execució en Mode Desenvolupament

Aquest comandament iniciarà el servidor de Vite i l'aplicació Electron simultàniament amb recàrrega automàtica.

```sh
npm run electron-dev
```

## 📦 Compilació (Build)
### Compilar per a Linux

Per crear una versió de producció de l'aplicació (p. ex., un fitxer `.AppImage` per a Linux):

```sh
npm run build:linux
```

### Compilar per a Windows

Aquest comandament crearà tant l'instal·lador (-Setup.exe) com la versió portable (.exe).

```sh
npm run build:win
```

### Compilar per a macOS

Aquest comandament crearà els fitxers `.dmg` i `.zip` per a macOS.

```sh
npm run build:mac
```

El resultat es desarà al directori `dist`.

## ✒️ Autoria

-   **Autor Principal:** Pëp 
-   **Co-autoria i Suport Tècnic:** Isaac ;) / Gemini / Github Copilot / Perplexity / ChatGPT

### Captures de pantalla:    
![Captura de pantalla del gestor d'events i personal](imatges%20i%20recursos/screenshot1mac.jpeg)


## 📄 Llicència

Aquest projecte està sota la llicència MIT.

> Copyright (c) 2025 Pëp
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.
