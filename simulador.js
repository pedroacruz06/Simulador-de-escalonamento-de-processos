// ----------------------------
// Estados globais (constantes)
// ----------------------------
const ESTADO_NAO_CHEGOU = 0;
const ESTADO_EXECUCAO = 1;
const ESTADO_ESPERA = 2;
const ESTADO_TERMINOU = 3;
const ESTADO_SOBRECARGA =4;


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
    this.processosOriginais = processos.slice();
    this.processos = processos.slice();
    this.algoritmo = algoritmo;
    this.quantum = quantum;
    this.sobrecarga = sobrecarga;

    this.prontos = [];
    this.finalizados = [];
    this.gantt = {};
    this.emExecucao = null;
    this.tempoQuantum = 0;
    this.tempoSobrecargaRestante = 0;

    // --- NOVO ---
    // Armazena a referência do processo que está sofrendo a preempção
    this.processoEmSobrecarga = null;

    // Inicializa o Gantt
    for (const p of this.processosOriginais) {
      this.gantt[p.id] = [];
    }
  }

  // (Não mudou)
  atualizarFila() {
    for (const p of this.processos) {
      if (p.chegada === this.tempo) {
        this.prontos.push(p);
      }
    }
    this.processos = this.processos.filter(p => p.chegada > this.tempo);
  }

  // (Não mudou)
  escolherProcesso() {
    if (this.prontos.length === 0) return null;

    if (this.algoritmo === "FIFO") {
      this.prontos.sort((a, b) => a.chegada - b.chegada);
    } else if (this.algoritmo === "SJF") {
      this.prontos.sort((a, b) => a.execucao - b.execucao);
    } else if (this.algoritmo === "RR") {
      // A ordem já é FIFO (pelo push/shift)
    }
    
    return this.prontos.shift(); 
  }

  //Função principal que simula a execução dos processos
  tick() {
    // 1. ATUALIZAR FILA (Novas chegadas)
    // Isso deve vir primeiro, para que o Gantt possa logar 'ESPERA' corretamente.
    this.atualizarFila();

    // 2. LOGAR NO GANTT
    // Loga o estado ATUAL (decidido no tick anterior) *antes* de processar
    // o tick atual. Esta é a correção principal.
    for (const p of this.processosOriginais) {
      if (p.chegada > this.tempo) {
        this.gantt[p.id].push(ESTADO_NAO_CHEGOU); // 0
      
      } else if (this.finalizados.find(x => x.id === p.id)) {
        this.gantt[p.id].push(ESTADO_TERMINOU); // 3
      
      } else if (this.tempoSobrecargaRestante > 0 && 
                 this.processoEmSobrecarga && 
                 this.processoEmSobrecarga.id === p.id) {
        // Apenas o processo que está saindo sofre sobrecarga
        this.gantt[p.id].push(ESTADO_SOBRECARGA); // 4

      } else if (this.emExecucao && this.emExecucao.id === p.id) {
        this.gantt[p.id].push(ESTADO_EXECUCAO); // 1
      
      } else {
        // Se já chegou, não terminou, e não está executando/sobrecarga -> ESPERA
        this.gantt[p.id].push(ESTADO_ESPERA); // 2
      }
    }
    
    // 3. PROCESSAR MÁQUINA DE ESTADOS (Decide o estado para o *próximo* tick)

    // ESTADO 1: CPU EM SOBRECARGA
    if (this.tempoSobrecargaRestante > 0) {
      this.tempoSobrecargaRestante--;

      if (this.tempoSobrecargaRestante === 0) { // Sobrecarga terminou
        this.processoEmSobrecarga = null;
        if (this.prontos.length > 0) {
          this.emExecucao = this.escolherProcesso();
          // O início é 'this.tempo + 1' porque o tick atual (this.tempo)
          // foi gasto com sobrecarga.
          if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo + 1;
          this.tempoQuantum = 0;
        }
      }
      
    // ESTADO 2: CPU EXECUTANDO UM PROCESSO
    } else if (this.emExecucao) {
      this.emExecucao.restante--;
      this.tempoQuantum++;

      // Verificação 1: O processo terminou?
      if (this.emExecucao.restante <= 0) {
        this.emExecucao.termino = this.tempo + 1; // Termina no *fim* deste tick
        this.emExecucao.turnaround = this.emExecucao.termino - this.emExecucao.chegada;
        this.emExecucao.espera = this.emExecucao.turnaround - this.emExecucao.execucao;
        this.finalizados.push(this.emExecucao);
        
        // --- CORREÇÃO DO "SALTO" ---
        // Imediatamente pega o próximo processo, se houver.
        if (this.prontos.length > 0) {
          this.emExecucao = this.escolherProcesso();
          // O início é 'this.tempo + 1' porque este tick (this.tempo)
          // foi o último do processo anterior.
          if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo + 1;
          this.tempoQuantum = 0;
        } else {
          this.emExecucao = null; // CPU fica ociosa
        }
      
      // Verificação 2: O quantum estourou? (Só para RR)
      } else if (this.algoritmo === "RR" && this.tempoQuantum >= this.quantum) {
        this.tempoSobrecargaRestante = this.sobrecarga; 
        this.processoEmSobrecarga = this.emExecucao; 
        this.prontos.push(this.emExecucao); 
        this.emExecucao = null; 
        this.tempoQuantum = 0;
      }
    
    // ESTADO 3: CPU OCIOSA (e sem sobrecarga vindo)
    } else if (this.prontos.length > 0) {
      this.emExecucao = this.escolherProcesso();
      // O início é 'this.tempo' porque a CPU *já estava* ociosa
      if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo;
      this.tempoQuantum = 0;
    }

    // 4. AVANÇAR O TEMPO
    this.tempo++;
  }

  // (Mantenha seu tick() como estava)

  // (Não mudou)
  finalizou() {
    return (
      this.processos.length === 0 &&
      this.prontos.length === 0 &&
      this.emExecucao === null &&
      this.tempoSobrecargaRestante === 0 
    );
  }

  // --- FUNÇÃO EXECUTAR() MODIFICADA ---
  executar() {
    
    // --- CORREÇÃO "PRIME THE PUMP" ---
    // Lida com processos que chegam no tempo 0 *antes* do primeiro tick.
    this.atualizarFila(); 
    if (this.prontos.length > 0 && this.emExecucao === null && this.tempoSobrecargaRestante === 0) {
      this.emExecucao = this.escolherProcesso();
      // O início é 'this.tempo' (que é 0)
      if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo; 
      this.tempoQuantum = 0;
    }
    // ---------------------------------

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
window.ESTADO_SOBRECARGA = ESTADO_SOBRECARGA;
