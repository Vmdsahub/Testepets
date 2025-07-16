#!/usr/bin/env python3
# Script temporário para limpar código órfão do sistema de pesca

import re

# Ler o arquivo
with open('src/components/Screens/FishingScreenModular.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remover o bloco órfão de código de captura antiga
pattern = r'\s*if \(nearbyFish && user\) \{.*?\}\s*else \{.*?setShowMinigame\(true\);\s*\}'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# Salvar o arquivo
with open('src/components/Screens/FishingScreenModular.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Código órfão removido com sucesso!")
