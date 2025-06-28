// Constantes
const HOST = 'http://localhost:5000/'

// Variáveis Globais
let currentNomeInvestidor = "Investidor(a)";
let simulacaoCalculada = null;
let simulacaoCalculadaAnterior = null; 
let simulacoesSalvas = [];
let edicaoSimulacaoId = null;
let simulacaoSalva = false;
let idParaDeletar = null;

const form = document.getElementById('simulacaoForm');
const resultadosSection = document.getElementById('resultados');
const tabelaEvolucaoBody = document.getElementById('tabelaEvolucao').getElementsByTagName('tbody')[0];
const loader = document.getElementById('loader');
const btnSimular = document.getElementById('btnSimular');
const nomeInvestidorInput = document.getElementById('nomeInvestidor');
const nomeInvestidorDisplaySpan = document.getElementById('nomeInvestidorDisplay');
const btnSalvar = document.getElementById('btnSalvar'); 
const btnNovaSimulacao = document.getElementById('btnNovaSimulacao');
const btnExcluirSimulacao = document.getElementById('btnExcluirSimulacao'); 
const tabelaHistoricoBody = document.getElementById('tabelaHistorico').getElementsByTagName('tbody')[0];
const historicoVazioMsg = document.getElementById('historicoVazioMsg');
const contadorHistoricoSpan = document.getElementById('contadorHistorico');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const deleteModalText = document.getElementById('deleteModalText');
const buscaHistoricoInput = document.getElementById('buscaHistoricoInput');
const limparBuscaBtn = document.getElementById('limparBuscaBtn');

// Modal
const infoModal = document.getElementById('infoModal');
const tituloInfoModal = document.getElementById('tituloInfoModal');
const primaryTextInfoModal = document.getElementById('primaryTextInfoModal');
const secondaryTextInfoModal = document.getElementById('secondaryTextInfoModal');
const closeInfoModalBtnPurple = document.getElementById('closeInfoModalBtnPurple');
const closeInfoModalBtnGray = document.getElementById('closeInfoModalBtnGray');
const closeInfoModalBtnRed = document.getElementById('closeInfoModalBtnRed');
const infoModalBtnExcluirSimulacao = document.getElementById('infoModalBtnExcluirSimulacao');

// Funções de Navegação por Abas
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', async () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const tabName = button.getAttribute('data-tab');
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
        if (tabName === 'historico') await renderizarHistorico();
    });
});

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    await renderizarHistorico();
    
    form.addEventListener('submit', handleExecutarSimulacao);
    btnSalvar.addEventListener('click', salvarOuAtualizarSimulacao);
    btnNovaSimulacao.addEventListener('click', handleNovaSimulacaoClick);
    btnExcluirSimulacao.addEventListener('click', () => {
        if (edicaoSimulacaoId) {
            modalConfirmaExclusao(edicaoSimulacaoId, nomeInvestidorInput.value);
        }
    });
    buscaHistoricoInput.addEventListener('input', async () => await renderizarHistorico());
    limparBuscaBtn.addEventListener('click', async () => {
        buscaHistoricoInput.value = '';
        await renderizarHistorico();
    });
    
    // Controle de botões modal
    closeInfoModalBtnPurple.addEventListener('click', () => infoModal.classList.add('hidden'));
    closeInfoModalBtnGray.addEventListener('click', () => infoModal.classList.add('hidden'));
    closeInfoModalBtnRed.addEventListener('click', () => infoModal.classList.add('hidden'));
    infoModalBtnExcluirSimulacao.addEventListener('click', processarExclusaoSimulacao);

});

async function handleExecutarSimulacao(event) {
    if(event) event.preventDefault(); 

    loader.style.display = 'block';
    btnSimular.textContent = 'Calculando...';
    form.querySelector('button[type="submit"]').disabled = true;

    currentNomeInvestidor = nomeInvestidorInput.value || "Investidor(a)";
    const primeiroAporte = parseFloat(document.getElementById('primeiroAporte').value);
    const aporteMensal = parseFloat(document.getElementById('aporteMensal').value);
    const taxaJurosAnualInput = parseFloat(document.getElementById('taxaJurosAnual').value);
    const periodoInput = parseInt(document.getElementById('periodo').value);
    const tipoPeriodoInput = document.getElementById('tipoPeriodo').value;
    const gastosMensais = parseFloat(document.getElementById('gastosMensais').value);

    if (isNaN(primeiroAporte) || isNaN(aporteMensal) || isNaN(taxaJurosAnualInput) || isNaN(periodoInput) || periodoInput <= 0) {
        alerta({titulo: 'Ops!', textoPrimario: 'Por favor, preencha todos os campos numéricos da simulação com valores válidos. O período deve ser maior que zero.', btnPurple: {status: true}});
        finalizarProcessamentoFormulario();
        resultadosSection.classList.add('hidden'); 
        return;
    }
    
    const taxaJurosAnual = taxaJurosAnualInput / 100;

    if (event) { 
        await new Promise(resolve => setTimeout(resolve, 800)); 
    }
    
    try {
        simulacaoCalculadaAnterior = simulacaoCalculada;
        const dadosParaCalcular = {
            nome: currentNomeInvestidor, 
            primeiroAporte, aporteMensal, 
            taxaJurosAnual, 
            periodo: periodoInput, 
            tipoPeriodo: tipoPeriodoInput, 
            gastosMensais
        };
        simulacaoCalculada = await execucaoCalculoSimulacao(dadosParaCalcular);
        simulacaoCalculada.inputs = {
            nomeInvestidor: currentNomeInvestidor, 
            primeiroAporte,
            aporteMensal,
            taxaJurosAnual: taxaJurosAnualInput, 
            periodo: periodoInput,
            tipoPeriodo: tipoPeriodoInput, 
            gastosMensais
        };
                            
        nomeInvestidorDisplaySpan.textContent = `para ${currentNomeInvestidor}`;
        exibirResultados(simulacaoCalculada);
        resultadosSection.classList.remove('hidden');

        if (comparaSimulacoes() && simulacaoSalva){
            btnSalvar.classList.add('hidden');    
        }else{
            simulacaoSalva = false;
            btnSalvar.classList.remove('hidden');
        };

        if (edicaoSimulacaoId) {
            btnNovaSimulacao.classList.remove('hidden');
            btnExcluirSimulacao.classList.remove('hidden');
        } else {
            btnNovaSimulacao.classList.add('hidden');
            btnExcluirSimulacao.classList.add('hidden');
            nomeInvestidorInput.disabled = false; 
        }
    } catch (error) {
        resultadosSection.classList.add('hidden');
        alerta({
            titulo: 'Ops!',
            textoPrimario: error,
            btnPurple: {status: true}
        });
    } finally {
        finalizarProcessamentoFormulario();
    }
}

function finalizarProcessamentoFormulario() {
    loader.style.display = 'none';
    btnSimular.textContent = 'Simular';
    form.querySelector('button[type="submit"]').disabled = false;
}

function handleNovaSimulacaoClick() {
    location.reload();
}

function exibirResultados(dados) {
    document.getElementById('resValorFinal').textContent = formatarMoeda(dados.valorFinal);
    document.getElementById('resTotalInvestido').textContent = formatarMoeda(dados.totalInvestido);
    document.getElementById('resTotalJuros').textContent = formatarMoeda(dados.totalJuros);
    document.getElementById('resPercJuros').textContent = dados.percentualJurosSobreFinal.toFixed(2) + '%';
    document.getElementById('resPercAportes').textContent = dados.percentualAportesSobreFinal.toFixed(2) + '%';
    
    const gastoMensal = parseFloat(document.getElementById('gastosMensais').value);
    if (!isNaN(gastoMensal) && gastoMensal > 0) {
        document.getElementById('resCoberturaCustos').textContent = anosMesesStr(dados.mesesCobertura);
    } else {
        document.getElementById('resCoberturaCustos').textContent = 'N/A';
    }
    
    document.getElementById('resRendaPassiva').textContent = formatarMoeda(dados.rendaPassivaMensalEstimada);
    document.getElementById('resEquivalenteAportes').textContent = dados.jurosSobreAporte.toFixed(1) + 'x';

    tabelaEvolucaoBody.innerHTML = '';
    //const labelPeriodoTabela = dados.inputs.tipoPeriodo === 'A' ? 'Ano' : 'Mês';
    const labelPeriodoTabela = 'DATA PREVISTA';
    document.querySelector("#tabelaEvolucao thead th:first-child").textContent = labelPeriodoTabela;

    dados.evolucaoDetalhada.forEach(item => {
        const row = tabelaEvolucaoBody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${item.data}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${formatarMoeda(item.saldo_inicial)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${formatarMoeda(item.aporte)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${formatarMoeda(item.juros_periodo)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-800">${formatarMoeda(item.saldo_final)}</td>
        `;
    });
}

async function salvarOuAtualizarSimulacao() {
    const nomeParaSalvar = nomeInvestidorInput.value || "Investidor(a)";
    const idEdicao = document.getElementById('simulacaoEditId').value || 0
    
    let periodoSalvar = simulacaoCalculada.inputs.periodo;
    if (simulacaoCalculada.inputs.tipoPeriodo === 'A') {
        periodoSalvar = simulacaoCalculada.inputs.periodo * 12;
    }

    const dados = {
        id: idEdicao,
        nome: nomeParaSalvar,
        primeiroAporte: simulacaoCalculada.inputs.primeiroAporte,
        aporteMensal: simulacaoCalculada.inputs.aporteMensal,
        taxaJurosAnual: (simulacaoCalculada.inputs.taxaJurosAnual / 100),
        periodo: periodoSalvar,  
        gastosMensais: simulacaoCalculada.inputs.gastosMensais,
        valorFinal: simulacaoCalculada.valorFinal
    };

    try{
        const response = await salvarSimulacao(dados);
        await renderizarHistorico();
        
        document.getElementById('simulacaoEditId').value = response.id;
        edicaoSimulacaoId = response.id;
        nomeInvestidorInput.disabled = true;
        simulacaoSalva = true;
        btnSalvar.classList.add('hidden');

        alerta({
            titulo: 'Simulação salva!',
            textoPrimario: 'A simulação foi salva com sucesso! Confira mais detalhes na aba "Minhas Simulações".',
            btnPurple: {status: true}
        });
    }
    catch (error){
        alerta({
            titulo: 'Ops!',
            textoPrimario: error,
            btnPurple: {status: true}
        });
    }
}

async function renderizarHistorico() {
    try{
        await obterSimulacoesSalvas();
        const termoBusca = buscaHistoricoInput.value.toLowerCase();
        const simulacoesFiltradas = simulacoesSalvas.filter(sim => 
            sim.nomeInvestidor.toLowerCase().includes(termoBusca)
        );

        tabelaHistoricoBody.innerHTML = ''; 
        contadorHistoricoSpan.textContent = simulacoesFiltradas.length;

        if (simulacoesFiltradas.length === 0) {
            historicoVazioMsg.classList.remove('hidden');
            document.getElementById('tabelaHistorico').classList.add('hidden');
            if (termoBusca) {
                    historicoVazioMsg.firstElementChild.textContent = `Nenhum resultado encontrado para "${buscaHistoricoInput.value}".`;
                    historicoVazioMsg.lastElementChild.textContent = 'Tente outro nome ou limpe a busca.';
            } else {
                historicoVazioMsg.firstElementChild.textContent = 'Nenhuma simulação salva ainda.';
                historicoVazioMsg.lastElementChild.textContent = 'Faça uma simulação e clique em "Salvar" para vê-la aqui.';
            }
        } else {
            historicoVazioMsg.classList.add('hidden');
            document.getElementById('tabelaHistorico').classList.remove('hidden'); 
            simulacoesFiltradas.forEach(sim => {
                const row = tabelaHistoricoBody.insertRow();
                row.innerHTML = `
                    <td class="px-3 py-2 text-sm text-gray-700 clickable-cell" onclick="carregarParaEdicao('${sim.id}')" title="Visualizar simulação">${sim.nomeInvestidor}</td>
                    <td class="px-3 py-2 text-sm text-gray-700">${formatarMoeda(sim.primeiroAporte)}</td>
                    <td class="px-3 py-2 text-sm text-gray-700">${formatarMoeda(sim.aporteMensal)}</td>
                    <td class="px-3 py-2 text-sm text-gray-700">${(sim.taxaJurosAnual * 100).toFixed(1)}%</td>
                    <td class="px-3 py-2 text-sm text-gray-700">${sim.periodo} meses</td>
                    <td class="px-3 py-2 text-sm text-gray-700">${formatarMoeda(sim.gastosMensais)}</td>
                    <td class="px-3 py-2 text-sm font-semibold text-gray-800">${formatarMoeda(sim.valorFinal)}</td>
                    <td class="px-3 py-2 text-sm text-gray-700 text-center">
                        <button onclick="carregarParaEdicao('${sim.id}')" class="block w-full text-violet-600 hover:text-violet-900 font-medium mb-1 text-xs" title="Editar simulação">EDITAR</button>
                        <button onclick="modalConfirmaExclusao('${sim.id}', '${sim.nomeInvestidor}')" class="block w-full text-red-600 hover:text-red-900 font-medium text-xs" title="Deletar simulação">EXCLUIR</button>
                    </td>
                `;
            });
        }

    }catch (error) {
        alerta({
            titulo: 'Ops!',
            textoPrimario: error,
            btnPurple: {status: true}
        });
    }
    
}

window.carregarParaEdicao = async (id) => {
    try{
        const simulacao = await obterSimulacaoSalva(parseInt(id));

        if (simulacao) {
            document.getElementById('simulacaoEditId').value = simulacao.id; 
            edicaoSimulacaoId = simulacao.id; 

            nomeInvestidorInput.value = simulacao.nomeInvestidor;
            nomeInvestidorInput.disabled = true; 
            document.getElementById('primeiroAporte').value = simulacao.primeiroAporte;
            document.getElementById('aporteMensal').value = simulacao.aporteMensal;
            document.getElementById('taxaJurosAnual').value = simulacao.taxaJurosAnual * 100;
            
            if (simulacao.periodo % 12 === 0 && simulacao.tipoPeriodo === 'M') { 
                document.getElementById('periodo').value = simulacao.periodo / 12;
                document.getElementById('tipoPeriodo').value = 'A';
            } else {
                document.getElementById('periodo').value = simulacao.periodo;
                document.getElementById('tipoPeriodo').value = 'M';
            }
            
            document.getElementById('gastosMensais').value = simulacao.gastosMensais || ''; 

            document.querySelector('.tab-button[data-tab="simulacao"]').click();
            simulacaoCalculada = null; 
            btnNovaSimulacao.classList.remove('hidden'); 
            btnExcluirSimulacao.classList.remove('hidden');
            
            handleExecutarSimulacao().then(() => {btnSalvar.classList.add('hidden'); simulacaoSalva = true;});
        }
    }catch (error){
        alerta({
            titulo: 'Ops!',
            textoPrimario: error,
            btnPurple: {status: true}
        });
    }
    
}

window.modalConfirmaExclusao = (id, nome) => {
    idParaDeletar = id;

    alerta({
        titulo: 'Confirma exclusão da simulação?',
        textoPrimario: `Você está prestes a excluir a simulação de "${nome}".`,
        btnGray: {status: true, text: 'Voltar'},
        btnExcluirSimulacao: {status: true, text: 'Confirmar'}
    });
}

async function processarExclusaoSimulacao() {
    try{
        if (idParaDeletar) {
        const idDeletado = idParaDeletar;
        await deletarSimulacaoSalva(idParaDeletar);
        simulacoesSalvas = simulacoesSalvas.filter(sim => sim.id !== parseInt(idDeletado));
        await renderizarHistorico();
        infoModal.classList.add('hidden');
        idParaDeletar = null;
        if (edicaoSimulacaoId === idDeletado) { 
            handleNovaSimulacaoClick(); 
        }
    }
    } catch (error){
        alerta({
            titulo: 'Ops!',
            textoPrimario: error,
            btnPurple: {status: true}
        });
    }
    
}

function comparaSimulacoes(){
    return JSON.stringify(simulacaoCalculadaAnterior) === JSON.stringify(simulacaoCalculada);
}

function anosMesesStr(mes){
    const anoValor = parseInt(mes / 12);
    const mesValor = (mes % 12);

    if (anoValor === 0) {
        anos = ''
    }
    else if (anoValor === 1) {
        anos = `1 ano e `
    }
    else {
        anos = `${anoValor} anos e `
    };

    return `${anos}${mesValor} meses`;
};

function alerta(dados){
    tituloInfoModal.textContent = dados.titulo ? dados.titulo : '';
    primaryTextInfoModal.textContent = dados.textoPrimario ? dados.textoPrimario : '';
    secondaryTextInfoModal.textContent = dados.textoSecundario ? dados.textoSecundario : '';
    closeInfoModalBtnPurple.textContent = dados.btnPurple?.text ? dados.btnPurple?.text : 'OK';
    closeInfoModalBtnGray.textContent = dados.btnGray?.text ? dados.btnGray?.text : 'Cancelar';
    closeInfoModalBtnRed.textContent = dados.btnRed?.text ? dados.btnRed?.text : 'Excluir';
    infoModalBtnExcluirSimulacao.textContent = dados.btnExcluirSimulacao?.text ? dados.btnExcluirSimulacao?.text : 'Excluir';
    
    dados.btnPurple?.status ? closeInfoModalBtnPurple.classList.remove('hidden') : closeInfoModalBtnPurple.classList.add('hidden')
    dados.btnGray?.status ? closeInfoModalBtnGray.classList.remove('hidden') : closeInfoModalBtnGray.classList.add('hidden')
    dados.btnRed?.status ? closeInfoModalBtnRed.classList.remove('hidden') : closeInfoModalBtnRed.classList.add('hidden')
    dados.btnExcluirSimulacao?.status ? infoModalBtnExcluirSimulacao.classList.remove('hidden') : infoModalBtnExcluirSimulacao.classList.add('hidden')
    infoModal.classList.remove('hidden');
};

function formatarMoeda(valor) {
    if (isNaN(valor) || valor === null) return "R$ 0,00"; 
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/* Conexão com a API
*/
async function execucaoCalculoSimulacao(dados){
    /* Solicita calculo da simulação
    */
    const formData = new FormData();
    formData.append('nome', dados.nome);
    formData.append('primeiro_aporte', dados.primeiroAporte);
    formData.append('aporte_mensal', dados.aporteMensal);
    formData.append('tx_juros_anual', dados.taxaJurosAnual);
    formData.append('periodo', dados.periodo);
    formData.append('tipo_periodo', dados.tipoPeriodo);
    formData.append('gastos_mensais', dados.gastosMensais);

    try{
        const response = await fetch(HOST + 'calculo_simulacao', { method: 'post', body: formData });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        return {
                    valorFinal: data.resultado_total_acumulado,
                    totalInvestido: data.total_investido,
                    totalJuros: data.juros_recebidos,
                    percentualJurosSobreFinal: data.perc_investido_vs_juros.percentual_juros,
                    percentualAportesSobreFinal: data.perc_investido_vs_juros.percentual_aportes,
                    mesesCobertura: data.cobertura_gastos_pessoais.meses_cobertura,
                    anosCobertura: data.cobertura_gastos_pessoais.anos_cobertura,
                    rendaPassivaMensalEstimada: data.renda_passiva_estimada,
                    jurosSobreAporte: data.juros_sobre_aporte,
                    evolucaoDetalhada: data.evolucao_patrimonial.mensal
                };
    }    
    catch (error){
        console.error('Erro ao calclular a simulação:', error);
        throw new Error('Tivemos um problema ao calcular a simulação. Por favor, tente novamente mais tarde.');
    }
};

async function salvarSimulacao(dados){
    /* Salva simulação calculada
    */
    const formData = new FormData();
    formData.append('id', dados.id);
    formData.append('nome', dados.nome);
    formData.append('valor_inicial', dados.primeiroAporte);
    formData.append('aporte_mensal', dados.aporteMensal);
    formData.append('tx_anual', dados.taxaJurosAnual);
    formData.append('periodo', dados.periodo);
    formData.append('gasto_mensal', dados.gastosMensais);
    formData.append('valor_final', dados.valorFinal);

    try{
        const response = await fetch(HOST + 'salva_simulacao', { method: 'post', body: formData });
        
        // Verifica se a resposta da rede foi bem-sucedida (status 200-299)
        if (!response.ok) {
            // Lança um erro se a resposta não for OK (ex: 404, 500)
            const errorText = await response.text(); // Pega o texto do erro do servidor, se houver
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        return data;
    }    
    catch (error){
        console.error('Erro ao salvar simulação:', error);
        //throw error; Relança o erro para que a função chamadora possa capturá-lo
        throw new Error('Tivemos um problema na hora de salvar/atualizar o registro. Por favor, tente novamente mais tarde.');
    }
};

async function obterSimulacoesSalvas(){
    /* Obtem uma lista com todas as simulações salvas
    */
    try{
        const response = await fetch(HOST + 'obter_simulacoes', { method: 'get', });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        simulacoesSalvas = data.simulacoes.map( item => {
                                    return {
                                        id: item.id,
                                        nomeInvestidor: item.nome,
                                        primeiroAporte: item.valor_inicial,
                                        aporteMensal: item.aporte_mensal,
                                        taxaJurosAnual: item.tx_anual,
                                        periodo: item.periodo,
                                        tipoPeriodo: 'M',
                                        gastosMensais: item.gasto_mensal,
                                        valorFinal: item.valor_final
                                    };
                                });
    }    
    catch (error){
        console.error('Erro ao obter simulações:', error);
        throw new Error('Tivemos um problema ao obter as simulações. Por favor, tente novamente mais tarde.');
    }
};

async function obterSimulacaoSalva(id){
    /* Obtem simulação salva a partir do id
    */
    try{
        const response = await fetch(HOST + 'obter_simulacao?id=' + id, { method: 'get', });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        return {
                    id: data.id,
                    nomeInvestidor: data.nome,
                    primeiroAporte: data.valor_inicial,
                    aporteMensal: data.aporte_mensal,
                    taxaJurosAnual: data.tx_anual,
                    periodo: data.periodo,
                    tipoPeriodo: 'M',
                    gastosMensais: data.gasto_mensal,
                    valorFinal: data.valor_final
                };
    }    
    catch (error){
        console.error('Erro ao obter simulação:', error);
        throw new Error('Tivemos um problema ao obter a simulação salva. Por favor, tente novamente mais tarde.');
    }
};

async function deletarSimulacaoSalva(id){
    /* Deleta simulação a partir do id da simulação salva
    */
    try{
        const response = await fetch(HOST + 'deleta_simulacao?id=' + id, { method: 'delete', });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        return data;
    }    
    catch (error){
        console.error('Erro ao deletar simulação:', error);
        throw new Error('Não foi possível deletar a simulação. Por favor, tente novamente mais tarde.');
    }
};