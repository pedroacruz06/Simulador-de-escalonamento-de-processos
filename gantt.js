/**
 * Gera uma cor hexadecimal consistente baseada em uma string (ex: ID do processo).
 */
function gerarCor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

/**
 * Função Principal de Animação
 * @param {Object} resultado - O objeto retornado por sim.executar()
 * @param {HTMLElement} containerGantt - Div onde ficará o Gantt
 * @param {HTMLElement} containerRam - Div onde ficará o grid da RAM
 * @param {HTMLElement} containerTabelas - Div onde ficarão as tabelas de páginas
 * @param {number} intervalo - Tempo em ms entre cada tick
 */
function animarGantt(resultado, containerGantt, containerRam, containerTabelas, intervalo = 150) {
  const gantt = resultado.gantt;
  const historicoMemoria = resultado.historicoMemoria;
  const historicoTabelas = resultado.historicoTabelas;

  // ------------------------------------------------------
  // 1. PREPARAÇÃO DO GANTT (SETUP)
  // ------------------------------------------------------
  containerGantt.innerHTML = "";
  
  // Mapeamento de Estados para Cores
  const coresGantt = {
    [ESTADO_NAO_CHEGOU]: "#e0e0e0ff", // Cinza claro
    [ESTADO_EXECUCAO]:   "#4caf50", // Verde
    [ESTADO_ESPERA]:     "#ffeb3b", // Amarelo
    [ESTADO_TERMINOU]:   "#e0e0e0ff", // Cinza claro
    [ESTADO_SOBRECARGA]: "#ab2a2a", // Vermelho escuro
    [ESTADO_DISCO]:      "#35aeffff", // Azul claro (Page Fault)
    // Fallback
    "default": "#fff"
  };

  const processosIds = Object.keys(gantt);
  const linhasGantt = {};

  // Cria a estrutura (linhas) do Gantt
  processosIds.forEach(pid => {
    const linha = document.createElement("div");
    linha.classList.add("linha-processo");
    
    const label = document.createElement("div");
    label.classList.add("label-processo");
    label.textContent = pid;
    linha.appendChild(label);

    const timeline = document.createElement("div");
    timeline.classList.add("linha-tempo");
    linha.appendChild(timeline);

    containerGantt.appendChild(linha);
    linhasGantt[pid] = timeline;
  });

  // ------------------------------------------------------
  // 2. PREPARAÇÃO DA RAM (SETUP)
  // ------------------------------------------------------
  if (containerRam) {
    containerRam.innerHTML = "";
  }
  const celulasRam = []; // Array para acesso rápido às divs dos frames

  if (containerRam) {
    // Cria as 50 células estáticas (10 linhas x 5 colunas ou conforme CSS)
    for (let i = 0; i < 50; i++) {
        const cell = document.createElement("div");
        cell.classList.add("ram-cell");
        cell.title = `Frame ${i} (Livre)`;
        cell.textContent = i; 
        containerRam.appendChild(cell);
        celulasRam.push(cell);
    }
  }

  // ------------------------------------------------------
  // 3. PREPARAÇÃO DAS TABELAS DE PÁGINAS (SETUP)
  // ------------------------------------------------------
  if (containerTabelas) {
    containerTabelas.innerHTML = "";
  }
  const mapasTabelasDOM = {}; // Para guardar referência aos TBODIES

  if (containerTabelas && historicoTabelas) {
    processosIds.forEach(pid => {
      // Cria o esqueleto da tabela para cada processo
      const div = document.createElement("div");
      div.className = "tabela-processo";
      div.innerHTML = `
        <h4>Processo ${pid}</h4>
        <table>
          <thead>
            <tr>
              <th title="ID da Página Virtual">Pag</th>
              <th title="Frame na RAM Física">Frame</th>
              <th title="Bit de Validade">Valid</th>
            </tr>
          </thead>
          <tbody id="tbody-${pid}">
            </tbody>
        </table>
      `;
      containerTabelas.appendChild(div);
      mapasTabelasDOM[pid] = div.querySelector("tbody");
    });
  }

  // ------------------------------------------------------
  // 4. LOOP DE ANIMAÇÃO
  // ------------------------------------------------------
  const tempoTotal = Math.max(...Object.values(gantt).map(arr => arr.length));
  let t = 0;

  // Limpa timer anterior se houver (opcional, para evitar sobreposição se clicar rápido)
  if (window.timerAnimacao) clearInterval(window.timerAnimacao);

  window.timerAnimacao = setInterval(() => {
    if (t >= tempoTotal) {
      clearInterval(window.timerAnimacao);
      console.log("Animação finalizada.");
      return;
    }

    // --- A. ATUALIZA GANTT ---
    for (const pid of processosIds) {
      const estado = gantt[pid][t] ?? ESTADO_NAO_CHEGOU;
      const celula = document.createElement("div");
      celula.classList.add("tick");
      
      const cor = coresGantt[estado] || coresGantt["default"];
      celula.style.backgroundColor = cor;
      
      // Tooltip informativo
      celula.title = `t=${t} | PID: ${pid} | Estado: ${estado}`;
      
      linhasGantt[pid].appendChild(celula);
    }

    // --- B. ATUALIZA RAM (Somente se o modo memória estiver ativo) ---
    if (historicoMemoria && historicoMemoria[t] && containerRam) {
        const snapshot = historicoMemoria[t];
        
        snapshot.forEach((dadosFrame, index) => {
            const divCelula = celulasRam[index];
            if (!divCelula) return;

            if (dadosFrame === null) {
                // Frame Livre
                divCelula.style.backgroundColor = "#eee";
                divCelula.style.color = "#000";
                divCelula.innerHTML = index; // Volta a mostrar o número do frame
                divCelula.title = `Frame ${index} (Livre)`;
                divCelula.classList.remove("ocupado");
            } else {
                // Frame Ocupado
                const corProcesso = gerarCor(dadosFrame.pid);
                divCelula.style.backgroundColor = corProcesso;
                // Texto branco ou preto dependendo do contraste (simplificado para branco aqui)
                divCelula.style.color = "#fff"; 
                // Exibe PID e PagID
                divCelula.innerHTML = `<span style="font-weight:bold">${dadosFrame.pid}</span><small style="font-size:0.7em">p${dadosFrame.pageId}</small>`;
                divCelula.title = `Frame ${index} | Processo: ${dadosFrame.pid} | Página: ${dadosFrame.pageId}`;
                divCelula.classList.add("ocupado");
            }
        });
    }

    // --- C. ATUALIZA TABELAS DE PÁGINAS ---
    if (historicoTabelas && historicoTabelas[t] && containerTabelas) {
        const snapshotTabelas = historicoTabelas[t];

        processosIds.forEach(pid => {
            const dadosTabela = snapshotTabelas[pid]; 
            const tbody = mapasTabelasDOM[pid];

            if (dadosTabela && tbody) {
                // Gera HTML das linhas
                let html = "";
                dadosTabela.forEach(pag => {
                    const frameStr = pag.frame !== null ? pag.frame : "-";
                    // Define classes CSS para colorir o bit de validade
                    const classeValid = pag.valid ? "bit-valid-1" : "bit-valid-0";
                    const valorValid = pag.valid ? "1" : "0";

                    html += `
                        <tr>
                            <td>${pag.pageId}</td>
                            <td>${frameStr}</td>
                            <td class="${classeValid}">${valorValid}</td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            }
        });
    }

    // Avança o tempo
    t++;

  }, intervalo);
}

// Exporta para ser usado no HTML
window.animarGantt = animarGantt;