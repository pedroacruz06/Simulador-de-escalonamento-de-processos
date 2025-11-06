// ----------------------------
// Estados globais (constantes)
// ----------------------------
const ESTADO_NAO_CHEGOU = 0;
const ESTADO_EXECUCAO = 1;
const ESTADO_ESPERA = 2;
const ESTADO_TERMINOU = 3;

// ----------------------------
// Classe Processo
// ----------------------------
class Processo {
  constructor(id, chegada, execucao, prioridade = 1, deadline = Infinity) {
    this.id = id;
    this.chegada = chegada;
    this.execucao = execucao;
    this.restante = execucao;
    this.prioridade = prioridade;
    this.deadline = deadline;

    this.inicio = null;
    this.termino = null;
    this.espera = 0;
    this.turnaround = 0;
  }
}

// ----------------------------
// Classe Simulador
// ----------------------------
class Simulador {
  constructor(processos, algoritmo = "FIFO", quantum = 2, sobrecarga = 1) {
    this.tempo = 0;
    this.processosOriginais = processos.slice(); // para inicializar Gantt
    this.processos = processos.slice(); // cópia de trabalho
    this.algoritmo = algoritmo;
    this.quantum = quantum;
    this.sobrecarga = sobrecarga;

    this.prontos = [];
    this.finalizados = [];
    this.gantt = {}; // matriz temporal
    this.emExecucao = null;
    this.tempoQuantum = 0;

    // Inicializa o Gantt
    for (const p of this.processosOriginais) {
      this.gantt[p.id] = [];
    }
  }

  atualizarFila() {
    for (const p of this.processos) {
      if (p.chegada === this.tempo) {
        this.prontos.push(p);
      }
    }
    this.processos = this.processos.filter(p => p.chegada > this.tempo);
  }

  escolherProcesso() {
    if (this.algoritmo === "FIFO") {
      this.prontos.sort((a, b) => a.chegada - b.chegada);
    } else if (this.algoritmo === "SJF") {
      this.prontos.sort((a, b) => a.execucao - b.execucao);
    }
    return this.prontos[0];
  }

  tick() {
    this.atualizarFila();

    // Escolhe processo a executar
    if (!this.emExecucao && this.prontos.length > 0) {
      this.emExecucao = this.escolherProcesso();
      if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo;
      this.prontos = this.prontos.filter(p => p !== this.emExecucao);
      this.tempoQuantum = 0;
    }

    // Marca estados neste instante de tempo
    for (const p of this.processosOriginais) {
      if (p.chegada > this.tempo) {
        this.gantt[p.id].push(ESTADO_NAO_CHEGOU);
      } else if (this.emExecucao && this.emExecucao.id === p.id) {
        this.gantt[p.id].push(ESTADO_EXECUCAO);
      } else if (this.finalizados.find(x => x.id === p.id)) {
        this.gantt[p.id].push(ESTADO_TERMINOU);
      } else if (this.prontos.find(x => x.id === p.id)) {
        this.gantt[p.id].push(ESTADO_ESPERA);
      } else {
        this.gantt[p.id].push(ESTADO_TERMINOU); // segurança: já terminou
      }
    }

    // Atualiza execução e finalização
    if (this.emExecucao) {
      this.emExecucao.restante--;
      this.tempoQuantum++;

      if (this.emExecucao.restante <= 0) {
        this.emExecucao.termino = this.tempo + 1;
        this.emExecucao.turnaround = this.emExecucao.termino - this.emExecucao.chegada;
        this.emExecucao.espera = this.emExecucao.turnaround - this.emExecucao.execucao;
        this.finalizados.push(this.emExecucao);
        this.emExecucao = null;
      }
    }

    this.tempo++;
  }

  finalizou() {
    return (
      this.processos.length === 0 &&
      this.prontos.length === 0 &&
      this.emExecucao === null
    );
  }

  executar() {
    while (!this.finalizou()) {
      this.tick();
    }
    return { gantt: this.gantt, finalizados: this.finalizados };
  }
}

// ----------------------------
// Exportação global
// ----------------------------
window.Processo = Processo;
window.Simulador = Simulador;
window.ESTADO_NAO_CHEGOU = ESTADO_NAO_CHEGOU;
window.ESTADO_EXECUCAO = ESTADO_EXECUCAO;
window.ESTADO_ESPERA = ESTADO_ESPERA;
window.ESTADO_TERMINOU = ESTADO_TERMINOU;
