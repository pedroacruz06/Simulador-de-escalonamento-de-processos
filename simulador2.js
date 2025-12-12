// ----------------------------
// Util: PRNG Determinístico
// ----------------------------
function Mulberry32(seed) {
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ----------------------------
// Estados Globais
// ----------------------------
const ESTADO_NAO_CHEGOU = 0;
const ESTADO_EXECUCAO = 1;
const ESTADO_ESPERA = 2;
const ESTADO_TERMINOU = 3;
const ESTADO_SOBRECARGA = 4;
const ESTADO_DISCO = 5; // Novo estado: Bloqueado por Page Fault

// ----------------------------
// Constantes de Memória
// ----------------------------
const TAMANHO_RAM_FRAMES = 50; // 50 frames (200KB / 4KB)
const MAX_PAGINAS_PROCESSO = 10;

// ----------------------------
// Classe Processo (Híbrida)
// ----------------------------
export class Processo {
  constructor(id, chegada, execucao, prioridade = 1, deadline = Infinity, tamanho = 4) {
    this.id = id;
    this.chegada = chegada;
    this.execucao = execucao;
    this.restante = execucao;
    this.prioridade = prioridade;
    this.deadline = deadline;
    this.deadlineAbsoluto = chegada + deadline;
    this.estorouDeadline = false;
    
    // Dados de Escalonamento
    this.vruntime = 0;
    this.inicio = null;
    this.termino = null;
    this.espera = 0;
    this.turnaround = 0;
    
    // --- NOVO: DADOS DE MEMÓRIA ---
    // Se o tamanho for 0, forçamos pelo menos 1 página
    const numPaginas = Math.max(1, Math.min(tamanho, MAX_PAGINAS_PROCESSO));
    this.numPaginas = numPaginas;
    this.pageFaults = 0;
    this.paginaPendente = null;
    
    // Tabela de Páginas
    this.tabelaPaginas = [];
    for (let i = 0; i < numPaginas; i++) {
      this.tabelaPaginas.push({
        processId: this.id,
        pageId: i,
        valid: false,   // true = na RAM
        frame: null,    // índice do frame na RAM
        lastUsed: 0     // para LRU
      });
    }

    // Controle de bloqueio por I/O
    this.tempoBloqueioRestante = 0;
  }

  set_deadline(deadline) {
    this.deadline = deadline;
    this.deadlineAbsoluto = this.chegada + deadline;
  }

  set_chegada(chegada) {
    this.chegada = chegada;
    this.deadlineAbsoluto = chegada + this.deadline;
  }
}

// ----------------------------
// Classe Gerenciador de Memória
// ----------------------------
class GerenciadorMemoria {
  constructor(politica = 'FIFO', seed = 12345) {
    this.politica = politica; // 'FIFO' ou 'LRU'
    this.ram = new Array(TAMANHO_RAM_FRAMES).fill(null); // Array de frames
    this.prng = Mulberry32(seed); // Gerador de números aleatórios
    
    // Estruturas de controle
    this.fifoQueue = []; 
    this.lruClock = 0;
  }

  // Retorna TRUE se acesso OK (Hit), FALSE se Page Fault
 // Retorna TRUE se acesso OK (Hit), FALSE se Page Fault
  acessarPagina(processo) {
    let pageId;

    // 1. DECIDIR QUAL PÁGINA ACESSAR
    // Se o processo travou anteriormente, ele TEM que tentar a mesma página.
    if (processo.paginaPendente !== null) {
      pageId = processo.paginaPendente;
      // console.log(`Processo ${processo.id} retentando página ${pageId}`);
    } else {
      // Caso contrário, simula uma nova instrução acessando uma página aleatória
      pageId = Math.floor(this.prng() * processo.numPaginas);
    }

    const pagina = processo.tabelaPaginas[pageId];

    // Atualiza relógio global LRU a cada acesso de memória
    if (this.politica === 'LRU') this.lruClock++;

    // --- CASO 1: PAGE HIT (Sucesso) ---
    if (pagina.valid) {
      if (this.politica === 'LRU') {
        pagina.lastUsed = this.lruClock;
      }
      
      // SUCESSO! Limpamos a pendência, pois a instrução foi concluída.
      processo.paginaPendente = null; 
      
      return true; 
    }

    // --- CASO 2: PAGE FAULT (Falha) ---
    processo.pageFaults++;
    
    // "Lembramos" que este processo precisa desta página específica
    processo.paginaPendente = pageId;

    // Encontrar frame livre ou vítima
    let frameIndex = this.ram.indexOf(null);
    
    if (frameIndex === -1) {
      const vitima = this.encontrarVitima();
      frameIndex = vitima.frame;
      vitima.valid = false;
      vitima.frame = null;
      this.ram[frameIndex] = null; 
    }

    // Carrega a página (prepara o terreno para quando ele voltar do bloqueio)
    this.carregarPagina(pagina, frameIndex);

    return false; // Indica falha -> Simulador vai bloquear o processo
  }

  carregarPagina(pagina, frameIndex) {
    this.ram[frameIndex] = pagina;
    pagina.valid = true;
    pagina.frame = frameIndex;

    if (this.politica === 'FIFO') {
      this.fifoQueue.push(pagina);
    }
    if (this.politica === 'LRU') {
      pagina.lastUsed = this.lruClock;
    }
  }

  encontrarVitima() {
    if (this.politica === 'FIFO') {
      return this.fifoQueue.shift();
    }
    if (this.politica === 'LRU') {
      let vitima = null;
      // Procura página válida com menor lastUsed
      for (const p of this.ram) {
        if (p && (vitima === null || p.lastUsed < vitima.lastUsed)) {
          vitima = p;
        }
      }
      return vitima;
    }
    return null;
  }
}

// ----------------------------
// Classe Simulador (Integrada)
// ----------------------------
class Simulador {
  constructor(processos, algoritmo = "FIFO", modoMemoria = false, params = {}) {
    this.tempo = 0;
    this.processosOriginais = processos.slice(); // Cópia de segurança para o Gantt
    this.processos = processos.slice(); // Fila de entrada
    
    this.algoritmo = algoritmo;
    this.modoMemoria = modoMemoria;
    
    // Parâmetros
    this.quantum = params.quantum ?? 2;
    this.sobrecarga = params.sobrecarga ?? 1;
    this.custoDisco = params.custoDisco ?? 3;
    
    // Inicializa Gerenciador de Memória se o modo estiver ativo
    // Usamos uma seed fixa para garantir determinismo nos testes
    this.memoria = new GerenciadorMemoria(params.politicaMemoria || 'FIFO', 12345);

    // Filas
    this.prontos = [];
    this.bloqueadosDisco = []; // Fila de processos esperando I/O de disco
    this.finalizados = [];
    
    // Controle de CPU
    this.emExecucao = null;
    this.tempoQuantum = 0;
    this.tempoSobrecargaRestante = 0;
    this.processoEmSobrecarga = null;

    // Inicializa o Gantt
    this.gantt = {};
    for (const p of this.processosOriginais) {
      this.gantt[p.id] = [];
    }
  }

  atualizarFila() {
    // Processos chegando agora
    for (const p of this.processos) {
      if (p.chegada === this.tempo) {
        if (this.algoritmo === "CFS") p.vruntime = this.tempo;
        this.prontos.push(p);
      }
    }
    this.processos = this.processos.filter(p => p.chegada > this.tempo);
  }

  atualizarBloqueados() {
    // Verifica processos no disco (Page Fault)
    for (let i = this.bloqueadosDisco.length - 1; i >= 0; i--) {
      const p = this.bloqueadosDisco[i];
      p.tempoBloqueioRestante--;
      
      if (p.tempoBloqueioRestante <= 0) {
        // I/O terminou, volta para prontos
        this.bloqueadosDisco.splice(i, 1);
        
        // Em algoritmos preemptivos, voltar do disco pode gerar preempção?
        // Por simplicidade, colocamos na fila de prontos.
        if (this.algoritmo === "CFS") p.vruntime = this.tempo; // Reset ou mantém? Geralmente mantém ou penaliza levemente.
        this.prontos.push(p);
      }
    }
  }

  escolherProcesso() {
    if (this.prontos.length === 0) return null;

    if (this.algoritmo === "FIFO") {
      this.prontos.sort((a, b) => a.chegada - b.chegada);
    } else if (this.algoritmo === "SJF") {
      this.prontos.sort((a, b) => a.execucao - b.execucao);
    } else if (this.algoritmo === "EDF") {
      this.prontos.sort((a, b) => {
        if (a.deadlineAbsoluto === b.deadlineAbsoluto) return a.chegada - b.chegada;
        return a.deadlineAbsoluto - b.deadlineAbsoluto;
      });
    } else if (this.algoritmo === "CFS") {
      this.prontos.sort((a, b) => {
        if (a.vruntime === b.vruntime) return a.chegada - b.chegada;
        return a.vruntime - b.vruntime;
      });
    }
    
    // RR não ordena, pega o primeiro
    return this.prontos.shift(); 
  }

  // --- LÓGICA DE PREEMPÇÃO (Extraída para reutilização) ---
  verificarPreempcao() {
    if (!this.emExecucao) return false;
    let devePreemptar = false;

    // 1. Quantum (RR, EDF)
    if ((this.algoritmo === "RR" || this.algoritmo === "EDF") && this.tempoQuantum >= this.quantum) {
      devePreemptar = true;
    }
    // 2. EDF (Chegou alguém com deadline menor?)
    else if (this.algoritmo === "EDF" && this.prontos.length > 0) {
        this.prontos.sort((a, b) => a.deadlineAbsoluto - b.deadlineAbsoluto);
        if (this.prontos[0].deadlineAbsoluto < this.emExecucao.deadlineAbsoluto) devePreemptar = true;
    }
    // 3. CFS (Menor vruntime?)
    else if (this.algoritmo === "CFS" && this.prontos.length > 0) {
        this.prontos.sort((a, b) => a.vruntime - b.vruntime);
        if (this.prontos[0].vruntime < this.emExecucao.vruntime) devePreemptar = true;
    }

    if (devePreemptar) {
      this.tempoSobrecargaRestante = this.sobrecarga;
      this.processoEmSobrecarga = this.emExecucao;
      this.prontos.push(this.emExecucao);
      this.emExecucao = null;
      this.tempoQuantum = 0;
      return true;
    }
    return false;
  }

  tick() {
    // ------------------------------------------------------------
    // 1. GESTÃO DE FILAS E CHEGADAS
    // ------------------------------------------------------------
    this.atualizarFila();      // Novos processos entram na fila de prontos
    this.atualizarBloqueados(); // Processos saem do disco e voltam pra prontos

    // Tenta alocar CPU se estiver livre (IDLE)
    if (this.emExecucao === null && 
        this.tempoSobrecargaRestante === 0 && 
        this.prontos.length > 0) {
      
      this.emExecucao = this.escolherProcesso();
      if (this.emExecucao.inicio === null) this.emExecucao.inicio = this.tempo;
      this.tempoQuantum = 0;
    }

    // ------------------------------------------------------------
    // 2. VERIFICAÇÃO DE MEMÓRIA (O "Guardrail")
    // Isso deve acontecer ANTES do Gantt para pegar o Page Fault no tempo 0
    // ------------------------------------------------------------
    if (this.emExecucao && this.modoMemoria && this.tempoSobrecargaRestante === 0) {
        // Tenta acessar a página
        const sucesso = this.memoria.acessarPagina(this.emExecucao);

        if (!sucesso) {
            // PAGE FAULT!
            // Removemos da CPU imediatamente, ANTES de desenhar ou gastar tempo
            this.emExecucao.tempoBloqueioRestante = this.custoDisco;
            this.bloqueadosDisco.push(this.emExecucao);
            
            // O processo perde a vez na CPU
            this.emExecucao = null;
            this.tempoQuantum = 0;
            
            // Nota: Não geramos sobrecarga aqui para simplificar a visualização:
            // O bloqueio é imediato.
        }
    }

    // ------------------------------------------------------------
    // 3. REGISTRO DO GANTT
    // Agora o estado está "limpo":
    // - Se deu Page Fault, 'emExecucao' é null e o processo está em 'bloqueadosDisco'.
    // - Se a memória aceitou, 'emExecucao' ainda tem o processo.
    // ------------------------------------------------------------
    for (const p of this.processosOriginais) {
      if (p.chegada > this.tempo) {
        this.gantt[p.id].push(ESTADO_NAO_CHEGOU);
      } else if (this.finalizados.find(x => x.id === p.id)) {
        this.gantt[p.id].push(ESTADO_TERMINOU);
      } else if (this.bloqueadosDisco.find(x => x.id === p.id)) {
        this.gantt[p.id].push(ESTADO_DISCO); // Vai pintar de Azul
      } else if (this.tempoSobrecargaRestante > 0 && this.processoEmSobrecarga && this.processoEmSobrecarga.id === p.id) {
        this.gantt[p.id].push(ESTADO_SOBRECARGA);
      } else if (this.emExecucao && this.emExecucao.id === p.id) {
        this.gantt[p.id].push(ESTADO_EXECUCAO); // Vai pintar de Verde
      } else {
        this.gantt[p.id].push(ESTADO_ESPERA);
      }
    }

    // ------------------------------------------------------------
    // 4. EXECUÇÃO DA CPU (Consumo de Tempo)
    // Só decrementamos SE o processo sobreviveu à verificação de memória
    // ------------------------------------------------------------
    
    // Caso A: Sobrecarga
    if (this.tempoSobrecargaRestante > 0) {
      this.tempoSobrecargaRestante--;
      if (this.tempoSobrecargaRestante === 0) {
        this.processoEmSobrecarga = null;
      }
    } 
    // Caso B: Execução Real
    else if (this.emExecucao) {
        this.emExecucao.restante--;
        this.tempoQuantum++;

        if (this.algoritmo === "CFS") {
            const peso = Math.pow(1.25, this.emExecucao.prioridade - 1);
            this.emExecucao.vruntime += 1 * peso;
        }

        // Verifica se terminou
        if (this.emExecucao.restante <= 0) {
            this.emExecucao.termino = this.tempo + 1;
            this.emExecucao.turnaround = this.emExecucao.termino - this.emExecucao.chegada;
            this.emExecucao.espera = this.emExecucao.turnaround - this.emExecucao.execucao;
            
            if(this.algoritmo === "EDF" && this.emExecucao.deadlineAbsoluto < this.tempo + 1) {
                this.emExecucao.estorouDeadline = true;
            }

            this.finalizados.push(this.emExecucao);
            this.emExecucao = null; 
            this.tempoQuantum = 0;
        } else {
            // Se não terminou, verifica se deve sofrer preempção (Quantum/Prioridade)
            this.verificarPreempcao();
        }
    }

    // 5. Avança o tempo
    this.tempo++;
  }

  finalizou() {
    return (
      this.processos.length === 0 &&
      this.prontos.length === 0 &&
      this.bloqueadosDisco.length === 0 && // Também verifica disco
      this.emExecucao === null &&
      this.tempoSobrecargaRestante === 0 
    );
  }

  executar() {
    console.log("Simulação iniciada...");
    while (!this.finalizou()) {
      this.tick();
    }
    return { gantt: this.gantt, finalizados: this.finalizados };
  }
}

// ----------------------------
// Exportação Global
// ----------------------------
window.Processo = Processo;
window.Simulador = Simulador;
window.ESTADO_NAO_CHEGOU = ESTADO_NAO_CHEGOU;
window.ESTADO_EXECUCAO = ESTADO_EXECUCAO;
window.ESTADO_ESPERA = ESTADO_ESPERA;
window.ESTADO_TERMINOU = ESTADO_TERMINOU;
window.ESTADO_SOBRECARGA = ESTADO_SOBRECARGA;
window.ESTADO_DISCO = ESTADO_DISCO;

window.debugGantt = function (gantt) {
  console.log("=== GANTT VISUAL ===");
  for (const pid in gantt) {
    const linha = gantt[pid]
      .map(est => {
        switch (est) {
          case ESTADO_NAO_CHEGOU: return ".";
          case ESTADO_EXECUCAO:   return "E";
          case ESTADO_ESPERA:     return "w";
          case ESTADO_TERMINOU:   return "T";
          case ESTADO_SOBRECARGA: return "S";
          case ESTADO_DISCO:      return "D"; // D para Disco
          default: return "?";
        }
      })
      .join("");
    console.log(pid.padEnd(4) + ": " + linha);
  }
};