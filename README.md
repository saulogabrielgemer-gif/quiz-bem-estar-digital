# Quiz multiplayer — Bem-estar Digital e Saúde Mental

Aplicação web em português com sala por código, até 100 participantes por sala, perguntas cronometradas e ranking em tempo real. É um projeto inicial para uso educativo.

## O que está incluído
- Modo apresentador para criar uma sala.
- Código de sala com 6 caracteres.
- Participantes entram com código e apelido.
- 8 perguntas de múltipla escolha.
- Temporizador configurável entre 15 e 60 segundos.
- Pontuação por resposta correta, com bônus de velocidade.
- Ranking ao vivo e resultado final.
- Interface que funciona em celular e computador.

## Executar no computador

1. Instale Node.js 18 ou mais recente: https://nodejs.org/
2. Extraia o ZIP para uma pasta.
3. Abra um terminal dentro da pasta do projeto.
4. Execute:

   ```bash
   npm install
   npm start
   ```

5. No próprio computador, abra http://localhost:3000

## Testar com celulares na mesma rede Wi-Fi

1. Conecte o computador e os celulares à mesma rede Wi-Fi.
2. Descubra o endereço IP local do computador.
   - Windows: abra o Prompt de Comando e execute `ipconfig`; procure o IPv4.
   - macOS/Linux: use `ifconfig` ou `ip addr`.
3. Nos celulares, abra `http://IP-DO-COMPUTADOR:3000`, substituindo pelo IP real.
4. O apresentador cria uma sala e compartilha o código. Os jogadores entram pelo mesmo endereço.

Se não conectar, o firewall pode estar bloqueando o Node.js/porta 3000. Permita o Node.js na rede privada. Não abra portas do roteador para a internet para este teste.

## Hospedar na internet (exemplo: Render)

1. Crie uma conta em https://render.com/ e uma conta no GitHub em https://github.com/.
2. Envie os arquivos desta pasta para um repositório GitHub.
3. No Render, crie um **Web Service** conectado ao repositório.
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Runtime:** Node
5. Publique o serviço e espere o Render mostrar a URL HTTPS.
6. Abra essa URL, crie uma sala e compartilhe o link e o código com a turma.

A interface mostra automaticamente a URL do site para facilitar o compartilhamento. Todos devem abrir a mesma URL. Não precisa de banco de dados para a versão inicial.

## Importante para mais de 30 jogadores

O código aceita até 100 participantes por sala, mas isso não é uma garantia de desempenho em qualquer hospedagem. Teste com a turma antes do evento e escolha um plano de hospedagem que suporte o tráfego esperado. O plano gratuito de um host pode dormir quando fica inativo, ter limites de uso ou sofrer restrições. Para uma apresentação importante, teste a URL com antecedência.

## Regras do jogo

- O apresentador cria a sala e espera os jogadores entrarem.
- O apresentador clica em **Iniciar quiz**.
- Cada jogador escolhe uma alternativa no celular.
- Respostas corretas valem de 500 a 1000 pontos; responder mais rápido dá mais pontos.
- Quando o tempo acaba ou todos respondem, a resposta correta e a explicação aparecem.
- O apresentador clica em **Próxima pergunta**.
- Ao final, o ranking mostra a pontuação total.

## Limitações da primeira versão

- As salas ficam na memória do servidor; reiniciar ou dormir o servidor encerra as salas.
- Se o apresentador desconectar, a sala é encerrada.
- Não há contas de usuário nem persistência de ranking.
- Os apelidos são visíveis para os outros participantes; use apelidos apropriados e evite dados pessoais.
- O quiz é educativo e não substitui orientação profissional de saúde mental.
- Para um evento público, acrescente proteção contra abuso, validação adicional, monitoramento e testes de carga.
