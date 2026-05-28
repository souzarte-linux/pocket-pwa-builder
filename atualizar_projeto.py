import os
import urllib.request

# Configurações
FILES_TO_UPDATE = {
    "src/pages/Relatorios.tsx": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663029083228/cLBAFRNyJottTzOb.tsx",
    "src/pages/Painel.tsx": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663029083228/FYcekwNzdueGBWSJ.tsx"
}

def update_files():
    print("Iniciando a atualização dos arquivos do projeto...")
    
    # Verifica se estamos na raiz do projeto (onde a pasta src existe)
    if not os.path.exists("src"):
        print("ERRO: Pasta 'src' não encontrada. Certifique-se de executar este script na raiz do seu projeto (onde fica o package.json).")
        return

    for relative_path, url in FILES_TO_UPDATE.items():
        try:
            print(f"Baixando e atualizando: {relative_path}...")
            
            # Garante que o diretório de destino existe
            os.makedirs(os.path.dirname(relative_path), exist_ok=True)
            
            # Faz o download e sobrescreve o arquivo
            urllib.request.urlretrieve(url, relative_path)
            print(f"SUCESSO: {relative_path} atualizado.")
            
        except Exception as e:
            print(f"FALHA ao atualizar {relative_path}: {e}")

    print("\nAtualização concluída com sucesso!")
    print("Agora você pode rodar seu projeto normalmente no VS Code.")

if __name__ == "__main__":
    update_files()
