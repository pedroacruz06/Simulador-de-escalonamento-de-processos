/*
    ps = [
            {id: 1, chegada: 0, execucao: 5, ..., espera: 0, turnaround: 0, ...},
            {id: 2, chegada: 4, execucao: 7, ..., espera: 0, turnaround: 0, ...},
            .
            .
            {id: n, chegada: 0, execucao: 2, ..., espera: 0, turnaround: 0, ...},
        ]
*/

function FIFO(ps) {
    // implementado abaixo: tempos de chegada diferentes
    let i = 0, j = 0, time = 0;

    ps.sort((a, b) => a.chegada - b.chegada);   // ordena por tempo de chegada

    while(i < ps.length()) {      // suponha que o menor tempo de chegada sempre é 0
        time += ps[i].execucao;
        ps[i].turnaround += ps[i].execucao;
        j += i + 1;
        while (j < ps.length() && ps[j].chegada <= time) {
            ps[j].espera += time - ps[j].chegada; // computando a espera
            j++;
        }
    }

        i++;
}

