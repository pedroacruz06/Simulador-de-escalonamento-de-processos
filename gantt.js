function animarGantt(gantt, container, intervalo = 150) {
  container.innerHTML = ""; // limpa o container

  // Paleta de cores associada aos estados
  const cores = {
    [ESTADO_NAO_CHEGOU]: "#e0e0e0", // cinza claro
    [ESTADO_EXECUCAO]: "#4caf50",   // verde
    [ESTADO_ESPERA]: "#ffeb3b",     // amarelo
    [ESTADO_TERMINOU]: "#90caf9",    // azul claro
    [ESTADO_SOBRECARGA]:"#aa3c89ff"// Rosa
  };

  // Cria uma linha (div.row) para cada processo
  const processos = Object.keys(gantt);
  const linhas = {};

  processos.forEach(pid => {
    const linha = document.createElement("div");
    linha.classList.add("linha-processo");

    const label = document.createElement("div");
    label.classList.add("label-processo");
    label.textContent = pid;
    linha.appendChild(label);

    const timeline = document.createElement("div");
    timeline.classList.add("linha-tempo");
    linha.appendChild(timeline);

    container.appendChild(linha);
    linhas[pid] = timeline;
  });

  // Descobre o tempo total
  const tempoTotal = Math.max(...Object.values(gantt).map(arr => arr.length));
  let t = 0;

  // Anima a exibição, uma coluna por vez
  const timer = setInterval(() => {
    if (t >= tempoTotal) {
      clearInterval(timer);
      return;
    }

    for (const pid of processos) {
      const estado = gantt[pid][t] ?? ESTADO_NAO_CHEGOU;
      const celula = document.createElement("div");
      celula.classList.add("tick");
      celula.style.background = cores[estado] || "#fff";
      celula.title = `t=${t} (${pid}) — estado ${estado}`;
      linhas[pid].appendChild(celula);
    }

    t++;
  }, intervalo);
}

// Exporta globalmente
window.animarGantt = animarGantt;