import { Processo } from './simulador2.js';
import {executarGantt} from './gantt.js';
                    // -----------------------------
            // RECONSTRUÇÃO DA SIMULAÇÃO
            // -----------------------------
            window.addEventListener("DOMContentLoaded", () => {

                // Recupera os dados enviados pela página anterior
                const data = JSON.parse(localStorage.getItem("simuladorData"));

                if (!data) {
                    alert("Nenhuma simulação encontrada.");
                    return;
                }

                // -----------------------------
                // RECRIAR LISTA DE PROCESSOS
                // -----------------------------
                const processos = data.processos.map((p, idx) => {
                    console.log(`➡️ [DEBUG] Processo bruto [${idx}]`, p);

                    const pr = new Processo(p.id, p.chegada, p.execucao);

                    pr.prioridade = p.prioridade;
                    pr.set_deadline(p.deadline);
                    pr.tamanho = p.tamanho;

                    console.log(pr.tabelaPaginas);
                    console.log(`✔️ [DEBUG] Processo recriado [${idx}]`, pr);
                    return pr;
                });
                window.processosSim = processos;
                

                // -----------------------------
                // RECRIAR PARÂMETROS
                // -----------------------------
                const algoritmo = data.algoritmo;
                const modoMemoria = data.modoMemoria;
                const { quantum, sobrecarga, custoDisco } = data.parametros;

                // -----------------------------
                // CRIAR O SIMULADOR
                // -----------------------------
                const sim = new Simulador(processos, algoritmo, modoMemoria, {
                    quantum,
                    sobrecarga,
                    custoDisco
                });

                console.log("⚙️ [DEBUG] Algoritmo:", algoritmo);
                console.log("💾 [DEBUG] Modo memória ativado:", modoMemoria);
                console.log("🧮 [DEBUG] Parâmetros globais:", { quantum, sobrecarga, custoDisco });
                // -----------------------------
                // INICIAR SIMULAÇÃO
                // -----------------------------
                const sim1 = sim.executar();
                executarGantt(sim1.gantt, sim1.historicoMemoria, sim1.historicoTabelas);
                // Caso queira imprimir no console:
                console.log("Simulação carregada com sucesso!", sim1.gantt, sim1.finalizados);
                console.log("Outra simulação carregada com sucesso!", sim1.historicoMemoria, sim1.historicoTabelas);
                const tempoTotal = Math.max(...Object.values(sim1.gantt).map(arr => arr.length));

                console.log(tempoTotal, sim1.historicoMemoria);
          
            });