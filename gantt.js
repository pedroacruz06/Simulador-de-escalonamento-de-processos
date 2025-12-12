// Função auxiliar para gerar cores baseadas no ID do processo (String hash)
function gerarCor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function animarGantt(resultado, containerGantt, containerRam, intervalo = 150) {
  const gantt = resultado.gantt;
  const historicoMemoria = resultado.historicoMemoria;

  // 1. PREPARAÇÃO DO GANTT (Limpeza e Estrutura)
  containerGantt.innerHTML = "";
  const coresGantt = {
    [ESTADO_NAO_CHEGOU]: "#e0e0e0",
    [ESTADO_EXECUCAO]: "#4caf50",
    [ESTADO_ESPERA]: "#ffeb3b",
    [ESTADO_TERMINOU]: "#64b9ffff",
    [ESTADO_SOBRECARGA]: "#ab2a2aff",
    [ESTADO_DISCO]: "#0c0c0cff", // Preto/Cinza escuro para disco
    [ESTADO_ESTOURADO]: "#525252ff"
  };

  const processosIds = Object.keys(gantt);
  const linhasGantt = {};

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

  // 2. PREPARAÇÃO DA MEMÓRIA (Estrutura Inicial)
  containerRam.innerHTML = "";
  const celulasRam = []; // Array para guardar referência das 50 divs

  // Cria as 50 células estáticas (10 linhas x 5 colunas)
  for (let i = 0; i < 50; i++) {
    const cell = document.createElement("div");
    cell.classList.add("ram-cell");
    cell.title = `Frame ${i}`;
    cell.textContent = i; // Mostra o índice do frame inicialmente
    containerRam.appendChild(cell);
    celulasRam.push(cell);
  }

  // 3. LOOP DE ANIMAÇÃO
  const tempoTotal = Math.max(...Object.values(gantt).map(arr => arr.length));
  let t = 0;

  const timer = setInterval(() => {
    if (t >= tempoTotal) {
      clearInterval(timer);
      return;
    }

    // --- ATUALIZA GANTT ---
    for (const pid of processosIds) {
      const estado = gantt[pid][t] ?? ESTADO_NAO_CHEGOU;
      const celula = document.createElement("div");
      celula.classList.add("tick");
      celula.style.background = coresGantt[estado] || "#fff";
      celula.title = `t=${t} (${pid})`;
      linhasGantt[pid].appendChild(celula);
    }

    // --- ATUALIZA MEMÓRIA ---
    if (historicoMemoria && historicoMemoria[t]) {
      const snapshot = historicoMemoria[t];
      
      // Percorre os 50 frames do snapshot atual
      snapshot.forEach((dadosFrame, index) => {
        const divCelula = celulasRam[index];
        
        if (dadosFrame === null) {
          // Frame Livre
          divCelula.style.backgroundColor = "#eee";
          divCelula.textContent = index; // Mostra número do frame
          divCelula.classList.remove("ocupado");
        } else {
          // Frame Ocupado
          // Define uma cor única para o processo
          const corProcesso = gerarCor(dadosFrame.pid);
          
          divCelula.style.backgroundColor = corProcesso;
          divCelula.innerHTML = `<span>${dadosFrame.pid}</span><small>p${dadosFrame.pageId}</small>`;
          divCelula.classList.add("ocupado");
        }
      });
    }

    t++;
  }, intervalo);
}

window.animarGantt = animarGantt;