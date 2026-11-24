# Régua de balanceamento

Fonte: skill `rp-balance` (fórmulas em `references/formulas.md`). Números em `REGUA` (`src/combat/balance.js`), contas em
`src/combat/regua.js`, trava em `test/regua.test.js`, relatório com `npm run regua`. O código manda: se este texto e o código
discordarem, vale o código.

## Como uma habilidade nova entra
1. Escreva a habilidade em `src/combat/tecnicas.js` com o descritor `regua` (dano, efeitos, puxa/empurra, colisão, área, buff).
2. `npm run regua`: o relatório mostra rank, custo declarado × custo da régua, pico e dano por energia.
3. Ajuste o MENOR número possível, com comentário datado em `balance.js`. Um eixo por vez.
4. `npm test` precisa passar (a régua é teste). Guarde `npm run regua -- --json` antes e depois para comparar.

## A régua (pool de 100 de EA, sem regeneração; Stamina também 100)
| Eixo | Regra |
|---|---|
| Custo de EA | saída por faixas (0,55/pt até 20 · 1,5/pt de 20 a 35 · 0,15 de 35 a 40 · 0,6 acima) + efeitos (Atordoar 7, Imobilizar/Provocar 3, Vulnerável 2, DoT 1,5, Lentidão 1; × duração × chance) + 0,75 por casa de puxão/empurrão + 2 de colisão; × 1,15 se área; + 2 por buff próprio; `(subtotal + 6) × ação` (comum 1 · bônus 1,3 · reação 0,85). Tolerância ±2 |
| Escada de pico | dano máx. em % da vida de referência (100): recarga 0 ≤ 15% · 1–2 ≤ 25% · 3 ≤ 35% · 4+ ≤ 40% |
| Custo no pool | técnica com dano custa entre 5% e 35% do pool |
| Dano por energia | entre 0,6 e 3,0 (vale também para golpe físico em Stamina) |
| Buff sem dano | custo ≤ 15% do pool e recarga ≥ 3 |
| Rank pelo dano | D ≤ 18 · C ≤ 24 · B ≤ 32 · A ≤ 40 · S acima (área × 1,15) |
| Pontos do nó | raiz 1 · passiva 2 · D 1 · C 3 · B 4 · A 6 · S 10 |
| Requisito | `max(declarado, soma do caminho)`; o requisito mostrado sempre basta para comprar o caminho |
| Papel (Duelista = 100) | Tanque dano 70–75 / sobrevivência 130–150 · Mago 120–140 · Assassino 110–130 · Atirador 110–130 (frágeis ~90 de sobrevivência) |
| Defesa por Stamina | ainda não existe (esquiva/bloqueio entram com a reação) |

## Árvores
### REVISÃO de 24/11/2026 (Golpe Compactado): números do dono restaurados
O corpo a corpo de referência do nível 20 era 30 (Corte no Tronco, B). Com o **Golpe Compactado (Sangue, rank A, 36)** passou a **36**; teto de técnica comum
no pool passou de 35% para 40% (a fórmula da régua dá 40 para dano 36-40); e o **ápice** de 40 por dano escrito virou regra. Efeito nas árvores:

| Nó | Estava (nerfado) | Agora | Observação |
|---|---|---|---|
| Colapso (Ratio) | 28 / custo 30 | **30 / 33** (original) | 3x3 = 0,90 × 36 = 32; exceção de teste removida |
| Colapso Total (Ratio) | 35 / 39 | **38 / 39** (original) | final = 1,15 × 36 = 41 |
| Chama Plena (Coragem) | 35 / 40 | **40 / 40** (original) | no ápice |
| Chuva de Punhos | 28 / 32 | **30 / 36** (original) | exceção de teste removida |
| Sete Punhos | 35 / 36 / A | **40 / 37 / A / 6 pts** | continua A: S só existe acima de 40 e o ápice é 40 (original: 44, S, 10 pts) |
| Boi Perfurante (Dez Sombras) | 30 / 34 | **32 / 39** (original) | custo 39% do pool cabe no teto de 40% |

Mantidos: Rajada de Punhos 22 (alvo único à distância ≤ corpo a corpo do nível 5), os cortes de linhagem (Zenin, Nanami) e o resto dos ajustes das seções abaixo.
As tabelas "antes/depois" das seções Ratio, Coragem, Punhos e Dez Sombras abaixo descrevem a primeira passagem; **valem os números desta revisão**.

### Sangue (técnica inata do clã Kamo · 40 pontos) — `src/combat/arvores/sangue.js`
Requisitos = soma do caminho em todos os 10 nós (1·3·2·5·6·7·10·11·16·26); rank e custo de todas as técnicas batem com a régua, com preparo onde a técnica **exige Marca de Sangue**
(Golpe Compactado 40, Chuva Escarlate 36), linha ×1,15 e imbloqueável ×1,15 (Lança Perfurante 32), Rede de Fios 21. Coágulo é reação (custo escrito 14, recarga 2).
Único ajuste: **Maré Rubra 42 → 40** (custo 41 → 38): o ápice por dano escrito é 40. Sangramento = 5 de dano por turno (seu número), teto de 4 rodadas.
Pacote Kamo (Sangue + linhagem): dano condicional 15 + 10 = 25%, abaixo de 40%.
Em standby: **Marca de Sangue** (status), debuffs (Sangramento, Imobilizar, Atordoar), **Barreira** e **reação** (Coágulo), **bloqueio** (Lança imbloqueável).

### Ratio (clã Nanami · paga e exige Técnica Inata · 37 pontos) — `src/combat/arvores/ratio.js`
Estrutura e requisitos do dono passaram: o requisito de cada nó já era a soma do caminho (1·2·3·4·5·9·7·11·21·35), e rank e pontos de
todos os nós batem com a régua. Ajustes feitos pela régua (24/11/2026):

| Nó | Antes | Depois | Motivo |
|---|---|---|---|
| Colapso | dano 30 · custo 33 | dano 28 · custo 30 | 3x3 (9 casas) rende no máx. 0,90 do melhor golpe de alvo único do nível (30 → 27). 28 é o menor dano que mantém o rank A. **Passa 1 ponto do teto: exceção registrada no teste, aguarda o dono** |
| Colapso Total | dano 38 | dano 35 (custo 39 igual) | final do estilo rende no máx. 1,15 do mesmo golpe (34,5 → 35). Continua rank S |
| Voto de Hora Extra | custo 20 | custo 20 | buff sem dano: teto é 15% do pool × ação bônus 1,3 = 20. Passa no limite |

Sem mudança: Corte 7:3, Corte de Membro (custo 23 × régua 22, dentro da tolerância), Corte no Tronco, Mostrar as Cartas e as passivas.
Soma dos bônus de dano do estilo: Lâmina Cega +10% + Voto +25% = +35%, abaixo do teto de 40% no mesmo golpe (Mostrar as Cartas não soma com o Voto).

### Nanami (linhagem, só passivas · paga e exige Técnica Inata · 35 pontos) — `src/combat/arvores/nanami.js`
Passou sem mudança de número: requisitos = soma do caminho (1·3·3·6·6·10·10·15·15·35), preço pela escada de profundidade
(raiz 1, depois 2/3/4/5/6, a mesma da passiva racial) e todos os tetos permanentes:

| Eixo | Valor | Teto |
|---|---|---|
| Desconto de EA permanente | 3 + 4 + 5 = 12% | 20% |
| Precisão | +10 pp (Razão 7:3) | 35 pp |
| EA máxima | +5% (= +5 de EA) | +50 |
| Chance de Kokusen, pior caso | 0,5 base + 20 estado + 5 perm + 10 Fluxo + 4 Expediente = 39,5% | 40% (trava no motor: `KOKUSEN.chanceMax`) |

Ajustes feitos (24/11/2026, "faz o que achar melhor"):
- **Expediente Encerrado** −25% → **−18%** de EA: com os 12% permanentes fecha em 30%, o teto de desconto de uso único.
- **Hora Extra** +10% → **+5%** de dano: Lâmina Cega 10 + Voto 25 + Hora Extra 5 = 40%, o teto do mesmo golpe entre as duas árvores.
- **Nome repetido:** o nó da Nanami que dava +10 pp de precisão virou **Mira 7:3**; "Razão 7:3" fica só na raiz da Ratio. Um teste reprova nome repetido.
- **Orçamento (aviso, sem mudança):** Ratio (37) + Nanami (35) pagam da mesma Técnica Inata: build completa = 72 pontos, 60% dos 120 do nível 30.

### Zenin (linhagem, só passivas · paga e exige Técnica Inata · 30 pontos) — `src/combat/arvores/zenin.js`
Passou sem mudança de número: requisitos = soma do caminho (1·3·3·6·6·10·10·15·30), escada de preço por profundidade e tetos:

| Eixo | Valor | Teto |
|---|---|---|
| Esquiva permanente | +8 pp (Reflexos Zenin) | 12 pp |
| Esquiva no pico | 25 base + 8 + 15 (Instante Decisivo) = 48% | 65% geral |
| Desconto de EA permanente | 5% (só técnicas físicas e de ferramenta) | 20% |
| Dano do mesmo golpe (condicional) | Estudo 10 + Contra-ataque 15 + Ritmo 15 = 40% | 40% (exatamente no teto) |

**Movimento (decisão do dono, 24/11/2026): máximo de 5 casas por turno**, somando Velocidade, linhagem e buffs. O motor corta em `MOV_MAX`
(`criarParticipante`). Na árvore: Sangue Zenin +2 → **+1** (1ª rodada) e Instante Decisivo +3 → **+1**; Passo Treinado fica +1. Cada janela, somada
ao permanente, cabe nas 2 casas acima da base (3 → 5); juntas na 1ª rodada dariam 6 e o motor corta em 5. Quem tem Velocidade alta já está no teto.

**Em standby** (nó só como dado, campo `aguarda`): Reflexos Zenin, Contra-ataque Treinado (buff no próximo golpe depois de esquivar) e a esquiva do
Instante Decisivo aguardam o sistema de **esquiva**; Mente Fria aguarda o sistema de **debuffs**.

### Zenin · Coragem Ardente (técnica do clã · fogo e arma · 35 pontos) — `src/combat/arvores/coragem.js`
Requisitos = soma do caminho em todos os nós (1·2·3·5·5·6·7·9·11·25), rank e custo de cada técnica batem com a régua
(Lâmina de Fogo 16, Corte de Contra-ataque 20 como reação, Corredor 26, Chama Plena 40). Chamas em Volta é um **modo** (custo escrito 22, dano/energia 0,68).

| Mudança (24/11/2026) | Antes | Depois | Motivo |
|---|---|---|---|
| Chama Plena | dano 40 | **35** (custo 40 igual) | final de área rende no máx. 1,15 do maior golpe de alvo único do nível (30 → 35); igual ao Colapso Total da Ratio. Continua rank S |
| Estudo de Armas (linhagem Zenin) | +10% | **+5%** | Espadachim-Feiticeiro (+10%) soma no mesmo golpe com a linhagem: 10 + 10 + 15 + 15 = 50% |
| Ritmo de Caça (linhagem Zenin) | máx. +15% | **máx. +10%** | idem: agora 10 + 5 + 15 + 10 = 40%, o teto |

A régua ganhou: (1) **tabela de alvo único por nível** (14 · 22 · 30), porque esta árvore não tem golpe pesado de alvo único e a área ficaria sem referência;
(2) **reação** custa no máx. 20% do pool e recarga ≥ 2; (3) **modo** com custo escrito; (4) **pacotes do clã** (técnica + linhagem somadas) com o mesmo teto de 40%.

Assumido por mim (confirmar): **Queimadura = 3 de dano fixo por turno**, "acúmulo" = +1 turno (teto 6), então com Calor Intenso (+2) um DoT cheio soma 30,
igual ao maior golpe de alvo único. **Passivas** desta árvore custam 2/3/3/4 (escada por profundidade, como a linhagem); a régua pura pediria 2 fixo (total 31).
Em standby: tudo que aplica Queimadura aguarda o sistema de **debuffs**; Corte de Contra-ataque também aguarda **reação**.

### Zenin · Punhos Mísseis (técnica do clã · só punhos · 33 pontos, era 37) — `src/combat/arvores/punhos.js`
Requisitos = soma do caminho em todos os nós, custos batem com a régua (Soco 15, Punho Gigante 34 já com a quebra de Barreira), vida +10% dentro do teto de 35%.
Passivas custam pelo poder dentro da faixa "2 até a escada por profundidade" (2/3/3/4); Enxame e Impacto ficam abaixo da escada por serem estreitos.

| Nó | Antes | Depois | Motivo |
|---|---|---|---|
| Rajada de Punhos | dano 24 · custo 25 | **22 · 22** | alvo único à distância rende no máx. o corpo a corpo do nível (22). Continua rank C |
| Chuva de Punhos | dano 30 · custo 36 | **28 · 32** | 3x3 rende no máx. 0,90 do maior golpe de alvo único (27); 28 é o menor que mantém o rank A. **Exceção registrada** (mesmo caso do Colapso) |
| Sete Punhos | dano 44 · custo 39 · S · 10 pts | **35 · 36 · A · 6 pts** | final à distância rende no máx. 1,15 do corpo a corpo (35). Rank S só existe acima de 40, e o ápice da primeira camada para no 40: alvo único não chega a S. Requisito de Técnica Inata 25 → 21 (soma do caminho) |

Regras novas na régua: (1) **alvo único à distância** ≤ corpo a corpo do nível (final ×1,15); vale também para Azul e Vermelho (Vermelho passou a abrir no nível 12, rank B);
(2) **quebra de Barreira** custa 2 na fórmula; (3) bônus de dano com etiquetas **arma | punhos**, **single | multi**, **melee | ranged**: arma e punhos nunca somam no mesmo golpe.
Pacotes: Zenin + Punhos soma 40% (Contra-ataque 15 + Ritmo 10 + Temperamento 15), igual ao Zenin + Coragem Ardente.
Em standby: Punho Gigante e Impacto Devastador aguardam o sistema de **Barreira**.

### Zenin · Dez Sombras (sem Mahoraga · shikigami · 42 pontos) — `src/combat/arvores/sombras.js`
Requisitos = soma do caminho em todos os 13 nós (1·2·2·4·4·3·5·7·9·8·10·13·23); rank e custo de quase todos batem (Cães 14, Sapo 15, Serpente 19, Nue 20 ≈ 22, Elefante 30 ≈ 31).
Cervo Redondo é utilidade (custo escrito 26, cura 20, dano/energia 0,77). Domínio: Jardim de Sombras Quiméricas é rank S por definição.

| Nó | Antes | Depois | Motivo |
|---|---|---|---|
| Sombra Viva (movimento entre sombras) | +2 casas | **+1** | com o Passo Treinado (+1) da linhagem Zenin passaria do máximo de 5 casas |
| Cão Divino: Totalidade | +50% de dano | **+20%** | dano no mesmo golpe do clã ≤ 40%: Ritmo de Caça 10 + Totalidade + Tigre |
| Tigre Fúnebre | +10% por baixa, máx. +30% | **+5% por baixa, máx. +10%** | idem: 10 + 20 + 10 = 40 |
| Boi Perfurante | dano 32 · custo 39 | **30 · 34** | técnica comum custa no máx. 35% do pool (continua rank A; investida rende até 1,10 do corpo a corpo = 33) |
| Abismo Desconhecido do Poço | custo 31 | **28** | exige Nue e Sapo vivos = preparo (-10%), como o Colapso e a Chama Plena |
| Jardim de Sombras Quiméricas | custo 65 | **60** | Domínio custa 40-60% do pool |

Regras novas na régua: **Domínio** (rank S, uso único, 40-60% do pool); **investida** (até 1,10 do corpo a corpo do nível); deslocamento do próprio usuário
entra no custo; **alvo único do nível interpolado** (14 no nível 1, 22 no 5, 30 no 12; antes era degrau); movimento e esquiva agora conferem **cada janela isolada**
(juntas o motor corta em 5 casas e 65%). Pacote Zenin + Dez Sombras: dano 40% e esquiva 68% sem teto (corta em 65%).

Assumido por mim (confirmar): **Encharcado** tem peso leve (como Lentidão), porque você não disse o que ele faz; "ignora cobertura/invisibilidade" não entra no custo.
Em standby: **shikigami** (invocar, vida, destruição, não voltar no mesmo combate), **missão da staff** (rituais de domesticação: Sapo, Coelhos, Serpente, Nue, Elefante, Cervo, Boi;
Cães Divinos são de graça e o Abismo é fusão), debuffs e esquiva (Coelhos).

### Kamo (linhagem de sangue, só passivas · paga e exige Técnica Inata) — `src/combat/arvores/kamo.js`
**Topo PROPOSTO pela régua (24/11/2026, "mude o que achar melhor"):** os 8 nós enviados somavam 24 e o cabeçalho diz 30, então escrevi o nó de 6 pontos que faltava:
**Sangue Ancestral** (nível 30, Técnica Inata 30 = todos os 8 nós + 6; exige Coagulação Natural, Ferida Profunda e Sangue por Energia): 1 vez por combate, 3 rodadas, Sangramentos que você aplica
+2 de dano por turno (5 → 7) e +4 de EA por rodada; depois 2 rodadas com −10% de dano. Sangramento cheio = 7 × 4 = 28, abaixo do maior golpe de alvo único (36). **Trocar quando você mandar o seu** (campo `proposta` na árvore).

**Layout assumido (confirmar):** Reserva Rubra requer **Herança de Fluxo** (o texto dizia Coagulação Natural) e Sangue por Energia requer **Pulso de Combate** (o texto dizia Ferida Profunda).
Só assim os requisitos de Técnica Inata que você escreveu (6, 10, 14, 15) batem com a soma do caminho. Ao pé da letra, 4 requisitos ficam abaixo da soma
(Reserva 9, Pulso 13, Ferida 17, Sangue por Energia 22); um teste registra isso. Preços 1·2·2·3·3·4·4·5 dentro da faixa (Ferida Profunda custa 4, a escada pediria até 5).

Tetos: vida +10% (teto 35%), desconto −5% (20%), −30% do dano de Sangramento recebido (35%), +3 EA por rodada com vida < 50% (sem teto definido), 15 de EA pagos com vida, 1x por combate (15% do pool).
Mudança de régua: a linhagem aceita preço de 2 até a escada por profundidade (mais barato que a escada é permitido).
Em standby: **debuffs** (Sangramento) e a **árvore de técnica de sangue** do Kamo (Herança de Fluxo, Pulso, Ferida e Sangue por Energia falam em "técnicas de sangue").

## Requisitos de status (dono, 24/11/2026: "pode mudar, ou compartilhados")
Técnica Inata **paga** o nó e exige a soma do caminho. Um nó pode pedir também um **segundo status como mínimo (não é gasto)**:
valor = soma do caminho ÷ 3 (para cima); tudo junto cabe em 80% dos pontos do nível (4 por nível, até o 50). Aplicado em:

| Árvore | Segundo status | Nós (valor) |
|---|---|---|
| Ratio (aceita punhos) | **Força** nos golpes pesados | Corte de Membro 2 · Corte no Tronco 3 · Colapso 7 · Colapso Total 12 |
| Coragem Ardente (exige arma) | **Maestria em Armas** | Lâmina de Fogo 1 · Corte de Contra-ataque 2 · Chamas em Volta 3 · Corredor 3 · Chama Plena 9 |
| Linhagem Zenin | **Maestria em Armas** | Mão de Armeiro 1 · Estudo de Armas 2 |

Sem segundo status: Nanami (linhagem de EA/Kokusen) e o resto da Zenin. O pior caso do orçamento é a Chama Plena: Técnica Inata 25 + Maestria 9 = 34 de 96 no nível 30.
Se preferir que o segundo status **também pague** parte do custo (em vez de só ser mínimo), me diga: muda o saldo de pontos.

## Estado atual (24/11/2026)
| Habilidade | Rank | Custo | Régua | Obs. |
|---|---|---|---|---|
| Azul | D | 20 EA | 19 | puxa 3, Atraído 2 turnos |
| Vermelho | B | 30 EA | 30 | empurra 3, colisão, combo ×1,3 |
| Punho de Energia | buff | 15 EA | — | era 20: buff sem dano passa de 15% do pool (corrigido pela régua) |
| Ataque básico | — | 15 Stamina | — | 0,67 de dano por Stamina |

## Pendências da régua
- **Escala de vida:** a régua usa 100 + 3 por nível (skill); `src/rpg/balance.js` dá 10 por nível. Decidir qual vale antes de ligar as árvores ao combate.
- **Clã Nanami e técnica Ratio** não existem em `src/rpg/dados.js` (hoje: Kamo, Zenin, Gojo). Criar mexe nos pesos do sorteio.
- **Arma/punhos:** a árvore exige arma ou punhos e Lâmina Cega tem versão sem arma; falta o sistema de arma (Maestria em Armas).
- Executar os nós no motor (ponto fraco 7:3, área 3x3 e 5x5 com fogo amigo, entulho, destruir cobertura).
- **Decidido (24/11/2026):** Força, Maestria em Armas e Técnica Inata só desbloqueiam técnicas (requisito e carteira); não multiplicam dano.
- Falta decidir o que Velocidade (movimento/iniciativa), Vitalidade (vida) e Reserva CE fazem no código; hoje o jogo ainda usa os atributos antigos.
- Calibrar papéis no motor real quando houver mais de uma árvore.
- Defesa (esquiva/bloqueio), NPCs e chefes por tier, curva de XP: eixos separados, um de cada vez.
