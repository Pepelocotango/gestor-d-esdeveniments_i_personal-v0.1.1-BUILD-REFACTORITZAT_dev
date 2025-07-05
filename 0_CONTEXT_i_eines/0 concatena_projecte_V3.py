#!/usr/bin/env python3
import os

# --- Configuració ---

# Nom del fitxer de sortida
OUTPUT_FILE = "00_projecte_concatenat.txt"

# Llista de directoris a incloure en l'escaneig.
# S'exploraran recursivament.
DIRECTORIES_TO_INCLUDE = [
    "src",
    ".github",
    "examples json"
    ]

# Llista de fitxers específics a incloure des de l'arrel del projecte.
# Aquests fitxers són importants per entendre la configuració i l'estructura.
ROOT_FILES_TO_INCLUDE = [
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "tailwind.config.cjs",
    "postcss.config.cjs",
    "tsconfig.json",
    "main.cjs",
    "preload.cjs",
    "index.html",
    "README.md",
    "LICENSE",
    # Opcional: Altres fitxers de configuració a l'arrel
    ".gitattributes",
    ".gitignore",
    "metadata.json"

]

# Llista de directoris a excloure SEMPRE.
# Això evita incloure dependències, builds o l'historial de git.
DIRECTORIES_TO_EXCLUDE = [
    "0_CONTEXT_i_eines",
    "node_modules",
    "dist",
    ".git",
    # La teva tsconfig.json exclou 'chekpoints', així que ho afegim aquí també.
    "chekpoints" 
]

# Llista de fitxers a excloure SEMPRE, per seguretat o perquè són innecessaris.
FILES_TO_EXCLUDE = [
    # Fitxers sensibles que MAI s'han de compartir.
    "google-credentials.json",
    ".env.local",
    # El propi fitxer de sortida i aquest script.
    OUTPUT_FILE,
    os.path.basename(__file__),
    "0 arbre_directoris_a_fitxer_terminalv2.py", # Script auxiliar de l'usuari
    "0 concatena_projecte_V3.py" #aquest mateix script
]

# --- Lògica del Script ---

def write_file_content(outfile, file_path):
    """Escriu la capçalera i el contingut d'un fitxer a la sortida."""
    # Normalitzem el path per a una visualització consistent (p. ex., amb barres '/')
    relative_path = os.path.relpath(file_path).replace(os.sep, '/')
    outfile.write(f"--- START OF FILE: ./{relative_path} ---\n")
    try:
        # Utilitzem 'errors="ignore"' per a possibles fitxers binaris (imatges, etc.)
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            # Si el contingut està buit, ho indiquem per claredat.
            if not content.strip():
                outfile.write("[Fitxer buit]\n")
            else:
                outfile.write(content)
    except Exception as e:
        outfile.write(f"[Error llegint el fitxer: {e}]\n")
    outfile.write(f"\n--- END OF FILE: ./{relative_path} ---\n\n")

def main():
    """Funció principal per concatenar el projecte."""
    print("Iniciant la concatenació completa del projecte...")
    
    # Usem un set per a les exclusions per a una cerca més ràpida
    files_to_exclude_set = set(FILES_TO_EXCLUDE)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        # 1. Processar fitxers de l'arrel
        print("Processant fitxers de configuració de l'arrel...")
        for file_name in ROOT_FILES_TO_INCLUDE:
            if file_name in files_to_exclude_set:
                continue
            if os.path.exists(file_name) and os.path.isfile(file_name):
                print(f"  -> Afegint: {file_name}")
                write_file_content(outfile, file_name)
            else:
                print(f"Avís: El fitxer d'arrel '{file_name}' no s'ha trobat.")

        # 2. Processar directoris especificats
        for directory in DIRECTORIES_TO_INCLUDE:
            if not os.path.isdir(directory):
                print(f"Avís: El directori '{directory}' no existeix.")
                continue
                
            print(f"Processant el directori: '{directory}'...")
            # Utilitzem os.walk per recórrer l'arbre de directoris
            for root, dirs, files in os.walk(directory, topdown=True):
                # Pruning: Modifiquem 'dirs' al moment per no entrar a directoris exclosos.
                # Aquesta és la manera més eficient d'evitar explorar 'node_modules', etc.
                dirs[:] = [d for d in dirs if d not in DIRECTORIES_TO_EXCLUDE]

                # Ordenem els fitxers per tenir una sortida consistent
                files.sort()
                for file in files:
                    if file in files_to_exclude_set:
                        continue
                    
                    file_path = os.path.join(root, file)
                    print(f"  -> Afegint: {file_path}")
                    write_file_content(outfile, file_path)

    print("-" * 50)
    print(f"✅ Procés finalitzat amb èxit.")
    print(f"El projecte complet s'ha escrit a '{OUTPUT_FILE}'")
    print("-" * 50)

if __name__ == "__main__":
    main()