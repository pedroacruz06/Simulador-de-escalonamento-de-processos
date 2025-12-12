
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
export async function executarGantt (gantt) {

    

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
                img.src = "../imgs/cell_disco.png";
                div.appendChild(img);
            } else if (gantt[key][i] == 5) {
                img.src = "../imgs/cell_terminate.png";
                div.appendChild(img);
            }
        });

    }
}
