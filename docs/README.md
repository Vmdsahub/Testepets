# Xenopets - Documentação

Este diretório contém toda a documentação técnica do projeto Xenopets.

## Estrutura da Documentação

### 📁 guides/

Guias técnicos e de implementação:

- `GPU_OPTIMIZATIONS.md` - Otimizações de performance gráfica
- `PERFORMANCE_OPTIMIZATIONS.md` - Otimizações gerais de performance
- `UNCAPPED_FPS.md` - Configuração de FPS ilimitado
- `SHIP_POSITION_FIX.md` - Correções do sistema de posicionamento da nave
- `WORLD_EDITOR_GUIDE.md` - Guia do editor de mundo (admin)
- `WORLD_POSITIONS_SYSTEM.md` - Sistema de posições do mundo

### 📁 setup/

Configuração e setup:

- `COMO_ADICIONAR_MUSICAS.md` - Como adicionar novas músicas
- `MUSIC_SETUP.md` - Configuração do sistema de música
- `MUSICAS_ADICIONADAS.md` - Lista de músicas adicionadas

## Visão Geral do Projeto

### Tecnologias Principais

- **Frontend**: React 18 + TypeScript + Vite
- **Estado**: Zustand para gerenciamento de estado
- **Animações**: Framer Motion
- **Estilização**: Tailwind CSS
- **Banco de Dados**: Supabase (PostgreSQL)
- **Áudio**: Web Audio API personalizada

### Arquitetura

```
src/
├── components/          # Componentes React organizados por feature
│   ├── Admin/          # Painel administrativo
│   ├── Audio/          # Controles de música e áudio
│   ├── Auth/           # Autenticação e login
│   ├── CheckIn/        # Sistema de check-in diário
│   ├── Debug/          # Ferramentas de debug
│   ├── Game/           # Componentes do jogo (mapa, naves, etc)
│   ├── Layout/         # Layout e navegação
│   ├── Pet/            # Sistema de pets virtuais
│   ├── Screens/        # Telas principais do app
│   └── Store/          # Loja virtual
├── contexts/           # Contexts do React
├── hooks/              # Hooks customizados
├── lib/                # Configurações de bibliotecas
├── services/           # Serviços de API e lógica de negócio
├── store/              # Stores Zustand (estado global)
├── styles/             # Estilos CSS customizados
├── types/              # Definições TypeScript
└── utils/              # Utilitários e helpers
```

### Features Principais

1. **Sistema de Pets Virtuais**
   - Criação e gerenciamento de pets
   - Sistema de atributos e evolução
   - Alimentação e cuidados

2. **Exploração Espacial**
   - Mapa galáctico interativo
   - Navegação com nave espacial
   - Exploração de planetas

3. **Sistema Social**
   - Perfis de usuários
   - Visualização de conquistas
   - Sistema de notificações

4. **Loja Virtual**
   - Compra de itens com moedas do jogo
   - Sistema de códigos de resgate
   - Inventário de itens

5. **Sistema de Áudio**
   - Música de fundo dinâmica
   - Efeitos sonoros contextuais
   - Controles de volume personalizados

### Performance

O projeto implementa várias otimizações:

- **GPU Acceleration**: Uso de CSS para aceleração de hardware
- **Canvas Optimization**: Renderização otimizada do mapa galáctico
- **React Optimization**: Memoização e lazy loading
- **Audio Optimization**: Pré-carregamento e cache de áudio
