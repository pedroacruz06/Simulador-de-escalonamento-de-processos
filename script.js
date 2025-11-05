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

    while(i < ps.length) {      // suponha que o menor tempo de chegada sempre é 0
        
        if (time < ps[i].chegada) time = ps[i].chegada;

        ps[i].espera = time - ps[i].chegada;
        ps[i].turnaround = ps[i].espera + ps[i].execucao
        time += ps[i].execucao;

        i++;
    }
        
}

