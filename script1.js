//*funcionamento do gantt

//**suponha que o script recebe um vetor de objetos-processo ps
//**suponha também que o script recebe uma string timeline representando a linha do tempo do processamento

/*
    TIMELINE: será usada para gerar dinamicamente a construção do gráfico gantt como também sua animação em css
        FORMATO ----------
            [interval] - [id_pca][action][subinterval]#[id_pcb][action][subinterval]#...[id_pcz][action][subinterval]
            action = {exec, overh, block, wait}
*/
     

/* 
    0. o script recebe ps e uma string timeline;
    1. verifica a quantidade n de processos; n = ps.length;
    2. gera n divs dentro da div #gantt;
        2.1 cada div recebe um id-html = ps[k].id, 0 <= k <= n;
    3. 
    
*/

