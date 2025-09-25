# Realtime Chat — Plataforma de Chat em Tempo Real (Node.js + Socket.IO)

Uma aplicação de **chat em tempo real** com suporte a **salas privadas**, **emojis** e **criptografia ponta a ponta (E2E)** utilizando **Node.js**, **Express**, **Socket.IO** e **TweetNaCl**.

> ⚠️ **Aviso:** Este projeto é apenas para fins educacionais. Não use em produção sem uma auditoria de segurança adequada.

---

## ✨ Funcionalidades

* 🔑 **Criação e entrada em salas privadas** (com senha opcional)
* 🔒 **Criptografia ponta a ponta (E2E)**: mensagens são cifradas no cliente antes de enviar
* 😀 **Suporte a emojis** (via emoji-picker)
* 👥 **Lista de usuários ativos** em cada sala
* 🚪 **Entrar e sair de salas**
* 🗑️ **Salas são apagadas automaticamente** quando ficam vazias (se não forem persistentes)

---

## 📂 Estrutura do Projeto

```bash
realtime-chat/
├── index.js             # Servidor Express + Socket.IO
├── package.json
├── .env.example         # Variáveis de ambiente
├── public/
│   ├── index.html       # Interface web
│   ├── css/
│   │   └── style.css    # Estilos básicos
│   └── js/
│       └── client.js    # Lógica do cliente (E2E + chat)
├── screenshots/         # Coloque prints de tela aqui
├── README.md            # Este arquivo
└── DEVELOPER.md         # Detalhes técnicos adicionais
```

---

## 🛠️ Instalação e Uso

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/realtime-chat.git
cd realtime-chat
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite a porta, se necessário:

```env
PORT=3000
```

### 4. Rodar o servidor

Modo desenvolvimento (com auto-reload):

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

### 5. Abrir no navegador

Acesse:

```
http://localhost:3000
```

Abra em **duas abas/navegadores diferentes** para testar a comunicação.

---

## 🖥️ Prints de Tela

Adicione imagens na pasta `screenshots/` e insira abaixo:

* Tela inicial:
  ![Tela inicial](screenshots/home.png)
* Criando sala:
  ![Criando sala](screenshots/create-room.png)
* Conversa com criptografia:
  ![Chat E2E](screenshots/chat.png)

---

## 🏗️ Arquitetura

```mermaid
graph TD
    subgraph Cliente
        UI[Interface Web]
        ENC[Criptografia E2E]
        SocketClient[Socket.IO Client]
    end

    subgraph Servidor (Node.js)
        Express[Express Static Server]
        SocketServer[Socket.IO Server]
        RoomManager[Gerenciador de Salas]
    end

    UI --> ENC --> SocketClient --> SocketServer --> RoomManager
    RoomManager --> SocketServer --> SocketClient
```

---

## 🔐 Criptografia ponta a ponta

* Cada cliente gera um **par de chaves (pública/privada)** com TweetNaCl.
* A chave pública é compartilhada com os outros usuários da sala.
* Para cada mensagem, o emissor gera um **nonce** e cifra a mensagem com a chave pública do destinatário.
* O servidor **não pode ler** as mensagens (só encaminha).

---

## 📦 Dependências principais

* [express](https://www.npmjs.com/package/express)
* [socket.io](https://socket.io/)
* [bcryptjs](https://www.npmjs.com/package/bcryptjs) (hash de senhas de salas)
* [tweetnacl](https://github.com/dchest/tweetnacl-js) + [tweetnacl-util](https://www.npmjs.com/package/tweetnacl-util) (criptografia)
* [emoji-picker-element](https://github.com/nolanlawson/emoji-picker-element)

---

## 🚀 Deploy com Docker (opcional)

Crie um `Dockerfile`:

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build e execute:

```bash
docker build -t realtime-chat .
docker run -p 3000:3000 realtime-chat
```

---

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Envie a branch (`git push origin feature/nova-feature`)
5. Abra um **Pull Request**

---

## 📜 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
