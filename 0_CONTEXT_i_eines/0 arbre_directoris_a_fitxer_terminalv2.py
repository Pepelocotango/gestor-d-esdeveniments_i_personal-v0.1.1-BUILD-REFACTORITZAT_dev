#!/usr/bin/env python3
# --- arbre_directoris_a_fitxer.py (Versió Modificada) ---
# Genera un arbre de directoris excloent carpetes no desitjades.

import os
import sys

def arbre_simple_a_fitxer(directori_a_escanejar, fitxer_sortida_obj):
    """
    Escriu l'arbre de directoris a partir de 'directori_a_escanejar'
    a l'objecte fitxer 'fitxer_sortida_obj', excloent directoris específics.
    """
    print(f"Arbre del directori: {os.path.abspath(directori_a_escanejar)}\n", file=fitxer_sortida_obj)

    directori_base_norm = os.path.normpath(directori_a_escanejar)
    
    # <<< CANVI 1: Defineix aquí els noms de les carpetes a excloure >>>
    directorios_a_excluir = ['node_modules', '0_CONTEXT_i_eines', '.git', 'dist']

    for arrel, dirs, fitxers in os.walk(directori_a_escanejar, topdown=True):
        
        # <<< CANVI 2: Aquesta línia exclou els directoris de la llista >>>
        # Modifiquem la llista 'dirs' in-place per evitar que os.walk hi entri.
        dirs[:] = [d for d in dirs if d not in directorios_a_excluir]
        
        dirs.sort()
        arrel_norm = os.path.normpath(arrel)

        # Càlcul del nivell de profunditat
        if arrel_norm == directori_base_norm:
            nivell = 0
        else:
            prefix_a_eliminar = directori_base_norm
            if not directori_base_norm.endswith(os.sep) and directori_base_norm != os.path.dirname(directori_base_norm):
                 prefix_a_eliminar += os.sep
            
            part_relativa = arrel_norm
            if arrel_norm.startswith(prefix_a_eliminar):
                part_relativa = arrel_norm[len(prefix_a_eliminar):]
            
            nivell = part_relativa.count(os.sep)
            if not directori_base_norm.endswith(os.sep) and directori_base_norm != os.path.dirname(directori_base_norm) and part_relativa:
                 nivell +=1
            elif not part_relativa and arrel_norm != directori_base_norm : 
                nivell = 1

        indent = '    ' * nivell
        nom_directori_actual = os.path.basename(arrel_norm)
        
        if nivell == 0:
            print(f"{nom_directori_actual}/ (directori arrel de l'escaneig)", file=fitxer_sortida_obj)
        else:
            print(f"{indent}{nom_directori_actual}/", file=fitxer_sortida_obj)

        subindent = '    ' * (nivell + 1)
        for f in sorted(fitxers):
            print(f"{subindent}{f}", file=fitxer_sortida_obj)
        
        if fitxers and dirs:
             print("", file=fitxer_sortida_obj)


if __name__ == "__main__":
    try:
        directori_script = os.path.dirname(os.path.abspath(__file__))
        nom_fitxer_sortida = "00arbre_directoris.txt"
        ruta_completa_sortida = os.path.join(directori_script, nom_fitxer_sortida)
        directori_a_processar = directori_script

        with open(ruta_completa_sortida, 'w', encoding='utf-8') as f_out:
            arbre_simple_a_fitxer(directori_a_processar, f_out)

        print(f"L'arbre de directoris s'ha generat correctament a:")
        print(ruta_completa_sortida)
        print(f"S'ha escanejat el directori: {os.path.abspath(directori_a_processar)}")
        
        input("\nProcés completat. Prem ENTER per sortir...")

    except Exception as e:
        missatge_error = f"Ha ocorregut un error inesperat: {e}"
        print(missatge_error, file=sys.stderr)
        os.system(f'zenity --error --text="{missatge_error}" --title="Error en Arbre Directoris" 2>/dev/null || true')
        input(f"\nS'ha produït un error inesperat. Prem ENTER per sortir...")
        sys.exit(1)