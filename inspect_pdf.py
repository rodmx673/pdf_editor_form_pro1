import pymupdf
import sys

def inspeccionar_pdf(ruta_pdf):
    try:
        doc = pymupdf.open(ruta_pdf)
        print(f"=== INSPECCIONANDO: {ruta_pdf} ===\n")
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            widgets = list(page.widgets())
            
            for widget in widgets:
                # Solo nos interesan los campos de texto que tienen celdas (peine)
                max_len = getattr(widget, 'text_maxlen', 0)
                if max_len > 0:
                    print(f"--- Campo: {widget.field_name} ---")
                    print(f"Max Len (Celdas): {max_len}")
                    print(f"Font: {widget.text_font}")
                    print(f"Font Size: {widget.text_fontsize}")
                    print(f"Border Width: {widget.border_width}")
                    print(f"Border Color: {widget.border_color}")
                    print(f"Field Flags: {widget.field_flags}")
                    
                    # Verificar si tiene la bandera de Peine (Comb)
                    is_comb = bool(widget.field_flags & pymupdf.PDF_TX_FIELD_IS_COMB)
                    print(f"¿Es Modo Peine?: {is_comb}")
                    print()
                    
        doc.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Reemplaza esto si el archivo está en otra ruta
    inspeccionar_pdf("formulario_ajustado (13).pdf")
