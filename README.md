<p align="center">
  <img src="https://pub-08d4ac7de5354fadbfe07fcbc70237ba.r2.dev/icon-tribo.png" alt="Tribo" width="140" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=700&size=32&duration=3000&pause=1000&color=FFFFFF&center=true&vCenter=true&width=435&lines=Tribo;Conex%C3%B5es+Aut%C3%AAnticas;Sua+Rede+Social" alt="Typing SVG" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/plataforma-Android%20%7C%20iOS%20%7C%20Web-1a1a2e?style=for-the-badge&labelColor=0d0d1a" />
  <img src="https://img.shields.io/badge/vers%C3%A3o-1.0.0-1a1a2e?style=for-the-badge&labelColor=0d0d1a" />
  <img src="https://img.shields.io/badge/licen%C3%A7a-Privada-1a1a2e?style=for-the-badge&labelColor=0d0d1a" />
</p>

<br/>

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</p>

## Sobre

**Tribo** é uma rede social mobile construída para quem busca conexões reais. A plataforma vai além de curtidas e seguidores  ela cria espaços onde pessoas se encontram, compartilham e constroem comunidades com significado.

Feed inteligente, mensagens em tempo real, stories, reels, tribos temáticas e muito mais  tudo em uma experiência fluida e nativa.

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</p>

## Stack Tecnológica

<table align="center">
  <tr>
    <td align="center" width="140">
      <img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React Native" />
      <br/><strong>React Native</strong>
      <br/><sub>Interface Nativa</sub>
    </td>
    <td align="center" width="140">
      <img src="https://skillicons.dev/icons?i=expo" width="48" height="48" alt="Expo" />
      <br/><strong>Expo</strong>
      <br/><sub>Framework</sub>
    </td>
    <td align="center" width="140">
      <img src="https://skillicons.dev/icons?i=supabase" width="48" height="48" alt="Supabase" />
      <br/><strong>Supabase</strong>
      <br/><sub>Backend & Auth</sub>
    </td>
    <td align="center" width="140">
      <img src="https://skillicons.dev/icons?i=nodejs" width="48" height="48" alt="Socket.IO" />
      <br/><strong>Socket.IO</strong>
      <br/><sub>Tempo Real</sub>
    </td>
  </tr>
</table>

<br/>

<details>
<summary><strong>Ver todas as tecnologias</strong></summary>
<br/>

| Categoria | Tecnologia | Finalidade |
|:--|:--|:--|
| **Core** | React Native 0.81 | Interface mobile nativa |
| **Framework** | Expo SDK 54 | Toolchain e build |
| **OTA Updates** | Revopush / CodePush | Atualizações em tempo real sem novo APK |
| **Backend** | Supabase | Autenticação, banco de dados e storage |
| **Realtime** | Socket.IO | Mensagens e eventos em tempo real |
| **Navegação** | React Navigation 7 | Roteamento entre telas |
| **Auth** | Google Sign-In | Login social com Google |
| **Mídia** | Expo AV / Video | Reprodução de áudio e vídeo |
| **Notificações** | Expo Notifications | Push notifications |
| **Storage** | Async Storage | Persistência local |
| **HTTP** | Axios | Requisições à API |

</details>

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</p>

## Funcionalidades

<table>
  <tr>
    <td width="50%">

**Social**
- Feed com posts, imagens e vídeos do YouTube
- Stories com criação e visualização
- Reels com reprodução vertical
- Sistema de seguidores e solicitações
- Repost e compartilhamento

</td>
    <td width="50%">

**Comunicação**
- Chat em tempo real com Socket.IO
- Mensagens com resposta e citação
- Figurinhas e stickers de vídeo
- Mensagens temporárias (view once)
- Exportação de conversas

</td>
  </tr>
  <tr>
    <td width="50%">

**Comunidades**
- Criação de tribos temáticas
- Gerenciamento de membros
- Convites para grupos
- Configurações de grupo

</td>
    <td width="50%">

**Experiência & Infra**
- Atualizações Over-The-Air (OTA) silenciosas
- Tema claro e escuro
- Personalização de aparência
- Haptic feedback
- Proteção contra captura de tela
- Badge de verificação gold

</td>
  </tr>
</table>

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</p>

## Atualizações Over-the-Air (OTA / CodePush)

A Tribo utiliza **Revopush / CodePush** para entregar atualizações instantâneas de código JavaScript e assets aos usuários sem necessidade de baixar um novo APK.

### Publicar Atualização em Tempo Real (CLI)

```bash
# Publicar atualização imediata para Produção (Android)
npm run release:prod

# Publicar atualização para o ambiente de Staging (Testes)
npm run release:staging

# Publicar atualização para iOS
npm run release:ios
```

> ⚡ **Sincronização Silenciosa:** As atualizações são baixadas em segundo plano sem interromper a navegação do usuário e são aplicadas automaticamente no próximo reinício do aplicativo.

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</p>

## Instalação

```bash
# Clone o repositório
git clone https://github.com/luan-Silva-Dev-0fc/Tribo.git

# Entre na pasta do projeto
cd Tribo

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# Inicie o projeto
npx expo start
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_API_URL=<url_do_servidor>
EXPO_PUBLIC_YOUTUBE_API_KEY=<sua_chave_youtube>
```

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</p>

## Estrutura do Projeto

```
src/
├── components/
│   ├── chat/          # Componentes de mensagens
│   ├── feed/          # Feed, posts e compositor
│   ├── layout/        # Layouts e wrappers
│   ├── modals/        # Modais do app
│   ├── profile/       # Perfil e drawer
│   ├── reels/         # Player de reels
│   ├── stories/       # Barra de stories
│   └── ui/            # Componentes base
├── context/           # Context API (usuário)
├── lib/               # Supabase e utilitários
├── pages/             # Telas do app
│   ├── cadastro/
│   ├── feed/
│   ├── login/
│   ├── mensagens/
│   ├── perfil/
│   ├── reels/
│   ├── tendencias/
│   ├── tribos/
│   └── verificacao/
└── services/          # Serviços (auth, socket, etc)
```

<p align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</p>

<p align="center">
  <sub>Desenvolvido por <a href="https://github.com/luan-Silva-Dev-0fc"><strong>Luan Silva</strong></a></sub>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d0d1a,100:1a1a2e&height=100&section=footer" width="100%" />
</p>
