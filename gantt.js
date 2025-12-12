let processoSelecionado = 1; // padrão

procsDiv.querySelectorAll(".proc").forEach(procEl => {
    procEl.addEventListener("click", () => {
        processoSelecionado = procEl.dataset.id;
        atualizarTabelaPaginas(tempoAtual, historicoTabelas);
    });
});

function animarRAM (histMem, tempo) {

    const pai = document.getElementById("slots");
    
    for(let i = 0; i < 50; i++) {
        let j = i + 1;
        if (histMem[tempo][i]) {
            let filho = pai.querySelector(`:nth-child(${j})`);
            filho.classList.add('jump');
            console.log(histMem[tempo][i].pid % 5);
            if (histMem[tempo][i].pid % 5 == 1) {
                filho.style.filter = "hue-rotate(161deg) saturate(0.8)";

            } else if(histMem[tempo][i].pid % 5 == 2) {
                filho.style.filter = "hue-rotate(201deg) saturate(0.8)";

            } else if(histMem[tempo][i].pid % 5 == 3) {
                filho.style.filter = "hue-rotate(321deg) saturate(0.8)";

            } else if(histMem[tempo][i].pid % 5 == 0) {
                filho.style.filter = "none";
            } else { filho.style.filter = "hue-rotate(89deg) saturate(0.8)"; }
        }
        
    }
}

function atualizarTabelaPaginas(tempo, historicoTabelas) {
    const tabPagsDiv = document.getElementById("tab_pags");

    tabPagsDiv.innerHTML = "";

    const paginas = historicoTabelas[tempo]?.[processoSelecionado];

    if (!paginas) {
        tabPagsDiv.innerHTML = "<p>Nenhuma tabela neste tempo.</p>";
        return;
    }

    const table = document.createElement("table");

    // Cabeçalho
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    ["page", "frame", "valid"].forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Corpo
    const tbody = document.createElement("tbody");

    paginas.forEach((page, pageId) => {
        const tr = document.createElement("tr");

        // PAGE
        const tdPage = document.createElement("td");
        tdPage.textContent = pageId;
        tr.appendChild(tdPage);

        // FRAME
        const tdFrame = document.createElement("td");
        tdFrame.textContent = page.frame === null ? "-" : page.frame;
        tr.appendChild(tdFrame);

        // VALID
        const tdValid = document.createElement("td");
        tdValid.textContent = page.valid ? "1" : "0";
        tr.appendChild(tdValid);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tabPagsDiv.appendChild(table);
}


function esperar(ms) {
  return new Promise(resolve => {
    setTimeout(() => {resolve();}, ms);
  
    //function aoPressionar(e) {
    //  if (e.key === "ArrowRight") {
    //    document.removeEventListener("keydown", aoPressionar);
    //    resolve();
    //  }
    //}
    //document.addEventListener("keydown", aoPressionar);
  });
}
export async function executarGantt (gantt, histMem, histTab) {

    // pré-tratamento
    const procDiv = document.getElementById("processes")
    Object.keys(gantt).forEach(key => {
        let newDiv = document.createElement("div");
        newDiv.id = `pid${key}`;
        procDiv.appendChild(newDiv);

        newDiv.classList.add("process");
        let card = document.createElement('img');
        let desc = document.createElement('p');
        desc.innerText = `PROC.${key}`
        card.src="./imgs/card.png";
        newDiv.appendChild(card);
        newDiv.appendChild(desc);
    });

    const firstKey = Object.keys(gantt)[0];
    Object.keys(gantt).forEach(key => {
        
    });
    for (let i = 0; i < gantt[firstKey].length; i++) {
        await esperar(125);
        Object.keys(gantt).forEach(key => {
            let div = document.getElementById(`pid${key}`);
            let img = document.createElement('img');

            if(gantt[key][i] == 0) {
                img.src = "../imgs/cell.png";
                img.style.filter = "saturate(0) opacity(0.5)"
                div.appendChild(img);
            } else if (gantt[key][i] == 1) {
                img.src = "../imgs/cell.png";
                div.appendChild(img);
            } else if (gantt[key][i] == 2) {
                img.src = "../imgs/cell_wait.png";
                div.appendChild(img);
            } else if (gantt[key][i] == 3) {
                img.src = "../imgs/cell_over.png";
                div.appendChild(img);
            } else if (gantt[key][i] == 4) {
                img.src = "../imgs/cell_terminate.png";
                div.appendChild(img);
            } else if (gantt[key][i] == 5) {
                img.src = "../imgs/cell_disco.png";
                atualizarTabelaPaginas(i, histTab);
                animarRAM(histMem, i)
                div.appendChild(img);
            } else if (gantt[key][i] == 6) {
                img.src = "../imgs/cell_disco.png";
                div.appendChild(img);
            }
        });

    }
}
