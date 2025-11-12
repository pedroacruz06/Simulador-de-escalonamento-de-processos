// ----------------------------
// Estados globais (constantes)
// ----------------------------
const ESTADO_NAO_CHEGOU = 0;
const ESTADO_EXECUCAO = 1;
const ESTADO_ESPERA = 2;
const ESTADO_TERMINOU = 3;
const ESTADO_SOBRECARGA = 4;

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
    
    // --- NOVO PARA EDF ---
    // O deadline absoluto é o momento no tempo cronológico que ele deve terminar
    this.deadlineAbsoluto = chegada + deadline;
    this.estorouDeadline = false;

    this.vruntime = 0;
    
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
  constructor(processos, algoritmo = "FIFO", quantum = 3, sobrecarga = 1) {
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

    this.processoEmSobrecarga = null;

    // Inicializa o Gantt
    for (const p of this.processosOriginais) {
      this.gantt[p.id] = [];
    }
  }

  atualizarFila() {
    for (const p of this.processos) {
      if (p.chegada === this.tempo) {
        // Regra 1 CFS: Quando chega, vruntime = tempo_atual
        if (this.algoritmo === "CFS") {
            p.vruntime = this.tempo;
        }
        this.prontos.push(p);
      }
    }
    this.processos = this.processos.filter(p => p.chegada > this.tempo);
  }
  

  // --- MODIFICADO: Ordenação EDF ---
  escolherProcesso() {
    if (this.prontos.length === 0) return null;

    if (this.algoritmo === "FIFO") {
      this.prontos.sort((a, b) => a.chegada - b.chegada);
    } else if (this.algoritmo === "SJF") {
      this.prontos.sort((a, b) => a.execucao - b.execucao);
    } else if (this.algoritmo === "EDF") {
      // --- NOVO ---
      // Ordena pelo Deadline Absoluto (menor primeiro)
      this.prontos.sort((a, b) => {
        if (a.deadlineAbsoluto === b.deadlineAbsoluto) {
            return a.chegada - b.chegada; // Desempate por chegada
        }
        return a.deadlineAbsoluto - b.deadlineAbsoluto;
      });
    } else if (this.algoritmo === "CFS") {
        // Regra 3 CFS: O próximo a executar é o de menor vruntime
        // Desempate: quem chegou primeiro ou ID menor
        this.prontos.sort((a, b) => {
            if (a.vruntime === b.vruntime) {
                return a.chegada - b.chegada;
            }
            return a.vruntime - b.vruntime;
        });
      }
    // Se for RR, não ordena (mantém ordem de chegada/fila)
    
    return this.prontos.shift(); 
  }

  // Função principal que simula a execução dos processos
  tick() {
    this.atualizarFila();

    // --- 0.5. DECISÃO IMEDIATA (CORREÇÃO DO DELAY) ---
    // Se a CPU está livre e sem sobrecarga, pega o processo AGORA.
    // Isso garante que o Gantt veja 'EXECUCAO' já neste tick, e não 'ESPERA'.
    if (this.emExecucao === null && 
        this.tempoSobrecargaRestante === 0 && 
        this.prontos.length > 0) {
      
      this.emExecucao = this.escolherProcesso();
      
      // Se é a primeira vez que ele roda, marca o início
      if (this.emExecucao.inicio === null) {
          this.emExecucao.inicio = this.tempo;
      }
      
      this.tempoQuantum = 0;
    }
    
    
    
    // --- LOG DO GANTT (Mantido igual) ---
    for (const p of this.processosOriginais) {
      if (p.chegada > this.tempo) {
        this.gantt[p.id].push(ESTADO_NAO_CHEGOU); 
      } else if (this.finalizados.find(x => x.id === p.id)) {
        this.gantt[p.id].push(ESTADO_TERMINOU); 
      } else if (this.tempoSobrecargaRestante > 0 && 
                 this.processoEmSobrecarga && 
                 this.processoEmSobrecarga.id === p.id) {
        this.gantt[p.id].push(ESTADO_SOBRECARGA); 
      } else if (this.emExecucao && this.emExecucao.id === p.id) {
        this.gantt[p.id].push(ESTADO_EXECUCAO); 
      } else {
        this.gantt[p.id].push(ESTADO_ESPERA); 
      }
    }
    
    // --- MÁQUINA DE ESTADOS ---

    // ESTADO 1: CPU EM SOBRECARGA
    if (this.tempoSobrecargaRestante > 0) {
      this.tempoSobrecargaRestante--;
      if (this.tempoSobrecargaRestante === 0) { 
        this.processoEmSobrecarga = null;
        if (this.prontos.length > 0) {
          this.emExecucao = this.escolherProcesso();
          if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo + 1;
          this.tempoQuantum = 0;
        }
      }
      
    // ESTADO 2: CPU EXECUTANDO
    } else if (this.emExecucao) {
      this.emExecucao.restante--;
      this.tempoQuantum++;
      let processoTerminou = false;
      
      if (this.algoritmo === "CFS") {
          // Regra 2: vruntime aumenta segundo prioridade
          // w(prioridade) = (1.25)^(prioridade-1)
          const peso = Math.pow(1.25, this.emExecucao.prioridade - 1);
          this.emExecucao.vruntime += 1 * peso; // deltaT é 1 (tick)
      }

      // A. Processo Terminou
      if (this.emExecucao.restante <= 0) {
        processoTerminou = true;
        this.emExecucao.termino = this.tempo + 1; 
        this.emExecucao.turnaround = this.emExecucao.termino - this.emExecucao.chegada;
        this.emExecucao.espera = this.emExecucao.turnaround - this.emExecucao.execucao;
        if(this.algoritmo==="EDF" && this.emExecucao.deadlineAbsoluto < this.tempo +1){
          this.emExecucao.estorouDeadline= true;

        }
        
        
        this.finalizados.push(this.emExecucao);

        
        if (this.prontos.length > 0) {
          this.emExecucao = this.escolherProcesso();
          if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo + 1;
          this.tempoQuantum = 0;
        } else {
          this.emExecucao = null;
        }
      } 

      // B. Preempção por Deadline (EDF Puro)
      if (!processoTerminou && this.algoritmo === "EDF" && this.prontos.length > 0) {
        this.prontos.sort((a, b) => a.deadlineAbsoluto - b.deadlineAbsoluto);
        let melhorCandidato = this.prontos[0];

        if (melhorCandidato.deadlineAbsoluto < this.emExecucao.deadlineAbsoluto) {
             this.tempoSobrecargaRestante = this.sobrecarga;
             this.processoEmSobrecarga = this.emExecucao;
             this.prontos.push(this.emExecucao); 
             this.emExecucao = null; 
             this.tempoQuantum = 0;
        }
      }
      //preempção por CFS
      if (!processoTerminou && this.algoritmo === "CFS" && this.prontos.length > 0) {
          // Ordena para achar o menor vruntime da fila
          this.prontos.sort((a, b) => a.vruntime - b.vruntime);
          let melhorCandidato = this.prontos[0];

          // Regra 5: Preempção se outro processo tem vruntime menor
          // (Nota: Aqui a preempção é estrita, sem margem de granularidade mínima, conforme pedido)
          if (melhorCandidato.vruntime < this.emExecucao.vruntime) {
             this.tempoSobrecargaRestante = this.sobrecarga;
             this.processoEmSobrecarga = this.emExecucao;
             this.prontos.push(this.emExecucao);
             this.emExecucao = null;
             this.tempoQuantum = 0;
          }
        }
      
      // C. Preempção por Quantum (RR e agora EDF Híbrido)
      if (!processoTerminou && this.emExecucao !== null && 
          (this.algoritmo === "RR" || this.algoritmo === "EDF") && // Alteração aqui
          this.tempoQuantum >= this.quantum) {
        
        this.tempoSobrecargaRestante = this.sobrecarga; 
        this.processoEmSobrecarga = this.emExecucao; 
        this.prontos.push(this.emExecucao); 
        this.emExecucao = null; 
        this.tempoQuantum = 0;
      }
    
    // ESTADO 3: CPU OCIOSA
    } else if (this.prontos.length > 0) {
      this.emExecucao = this.escolherProcesso();
      if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo;
      this.tempoQuantum = 0;
    }

    this.tempo++;
  }

  finalizou() {
    return (
      this.processos.length === 0 &&
      this.prontos.length === 0 &&
      this.emExecucao === null &&
      this.tempoSobrecargaRestante === 0 
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
window.ESTADO_SOBRECARGA = ESTADO_SOBRECARGA;