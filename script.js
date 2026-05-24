// CONFIGURAÇÕES DO SUPABASE
const SUPABASE_URL = 'https://kvhvelquxtcxukpkdabg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aHZlbHF1eHRjeHVrcGtkYWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MTk0MDAsImV4cCI6MjA4NDI5NTQwMH0.gVCU4i1M5GGR96bDHExFBMKuDOcpl7khj10zycbky-U';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let listaModelagens = [];
let listaTecidos = []; 

// Variáveis de memória para manter o tecido selecionado no próximo grupo
let ultimoTecidoSelecionado = "";
let ultimoTecidoManual = "";
let carregandoRascunho = false; // Impede que o sistema salve por cima enquanto reconstrói a tela


function obterEmailVendedor() {
    const urlAtual = window.location.href;
    const params = new URLSearchParams(window.location.search);
    let vendedorId = params.get('id') || params.get('atendente');

    if (!vendedorId && urlAtual.includes('id=')) {
        vendedorId = urlAtual.split('id=')[1].split('&')[0];
    }

    return vendedorId ? vendedorId.trim().toLowerCase() : null;
}


// --- CORREÇÃO NA FUNÇÃO carregarPerfil ---
async function carregarPerfil() {
    carregandoRascunho = true; 
    
    const identificador = obterEmailVendedor();
    
    if (identificador) {
        try {
            const { data, error } = await _supabase
                .from('perfis_usuarios')
                .select('*')
                .ilike('email_usuario', `%${identificador}%`) 
                .maybeSingle();

            if (data) {
                if(document.getElementById('nome-empresa')) document.getElementById('nome-empresa').innerText = data.nome_empresa || "GTBot Empresa";
                if(document.getElementById('nome-atendente')) document.getElementById('nome-atendente').innerText = `Atendimento: ${data.nome_atendente || 'Geral'}`;
                
                if (data.modelagens) listaModelagens = data.modelagens.split(',').map(item => item.trim());
                if (data.tecidos) listaTecidos = data.tecidos.split(',').map(item => item.trim());
                
                const img = document.getElementById('logo-empresa');
                if (data.url_logo && img) {
                    img.src = data.url_logo;
                    img.style.display = 'inline-block';
                }
            } else {
                if(document.getElementById('nome-empresa')) document.getElementById('nome-empresa').innerText = "Vendedor não Identificado";
            }
        } catch (err) {
            console.error("Erro ao carregar perfil:", err);
        }
    } else {
        if(document.getElementById('nome-empresa')) document.getElementById('nome-empresa').innerText = "Link de Acesso Inválido";
    }

    // --- DENTRO DA carregarPerfil ---
// Localize esta parte no final da função e inverta a ordem como abaixo:

    const rascunhoSalvo = localStorage.getItem('rascunho_pedido');

    if (rascunhoSalvo) {
        console.log("Rascunho encontrado, restaurando...");
        restaurarRascunho(); // Primeiro restaura os dados (mesmo que em background)

        const dadosRascunho = JSON.parse(rascunhoSalvo);
        if (dadosRascunho.status === 'enviado_com_sucesso') {
            document.getElementById('formulario-pedido').style.display = 'none';
            document.getElementById('tela-sucesso').style.display = 'block';
            carregandoRascunho = false;
            const loading = document.getElementById('loading-inicial');
            if(loading) loading.style.display = 'none';
            return; // Agora sim, ele para aqui, mas com os dados já carregados no DOM
        }
    } else {
        adicionarGrupoModelagem();
    }

    setTimeout(() => {
        carregandoRascunho = false;
        const loading = document.getElementById('loading-inicial');
        if(loading) loading.style.display = 'none';
        console.log("Sistema pronto e salvamento liberado.");
    }, 1500); 
} // <-- FALTAVA ESTA CHAVE

// Gera o HTML das opções de tecido respeitando a memória da última escolha
function gerarOpcoesTecido() {
    let html = '<option value="">Selecione o tecido...</option>';
    listaTecidos.forEach(tec => {
        if(tec) {
            const selected = (tec === ultimoTecidoSelecionado) ? 'selected' : '';
            html += `<option value="${tec}" ${selected}>${tec}</option>`;
        }
    });
    const outSelected = (ultimoTecidoSelecionado === "OUTRA") ? 'selected' : '';
    html += `<option value="OUTRA" ${outSelected}>➕ Outro (Escrever manualmente)</option>`;
    return html;
}
function adicionarGrupoModelagem(criarLinhaPadrao = true) {
    const container = document.getElementById('container-modelagens');
    if (!container) return; // Segurança contra erro de DOM
    
    // Preparar Modelagens
    let opcoesModHtml = '<option value="">Selecione a modelagem...</option>';
    listaModelagens.forEach(mod => {
        opcoesModHtml += `<option value="${mod}">${mod}</option>`;
    });
    opcoesModHtml += `<option value="OUTRA">➕ Outra (Escrever manualmente)</option>`;

    const div = document.createElement('div');
    div.className = 'grupo-modelagem';
    div.innerHTML = `
        <div class="header-modelagem">
            <div class="campo" style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <label class="label-modelagem">Tecido / Material</label>
                <select class="i-tec-nome" onchange="alternarTecidoManualGrupo(this); salvarRascunho();" style="font-weight: bold;">
                    ${gerarOpcoesTecido()}
                </select>
                <input type="text" class="i-tec-manual" placeholder="Qual o nome do tecido?" 
                       value="${ultimoTecidoManual}"
                       style="display:${ultimoTecidoSelecionado === 'OUTRA' ? 'block' : 'none'}; margin-top: 10px; border-style: dashed; border-color: #3b82f6;">
            </div>

            <label class="label-modelagem">Modelagem</label>
            <div class="row-modelagem">
                <select class="i-mod-nome" onchange="alternarCampoManual(this); salvarRascunho();" style="font-weight: bold;">
                    ${opcoesModHtml}
                </select>
                <button type="button" class="btn-del-header" onclick="this.closest('.grupo-modelagem').remove(); salvarRascunho();">✕</button>
            </div>
            <input type="text" class="i-mod-manual" placeholder="Qual o nome da modelagem?" 
                   style="display:none; margin-top: 10px; border-style: dashed; border-color: #3b82f6;">
        </div>
        <div class="tabela-wrapper">
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">Nome</th>
                        <th style="width: 15%;">Tamanho</th>
                        <th style="width: 15%;">Número</th>
                        <th style="width: 15%;">Quantidade</th>
                        <th style="width: 25%;">Adicional</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody class="corpo-tabela-itens"></tbody>
            </table>
        </div>
        <button type="button" class="btn-add-item" onclick="adicionarLinhaItem(this)">+ Adicionar Item nesta Modelagem</button>
    `;
    container.appendChild(div);

    if (criarLinhaPadrao) {
        adicionarLinhaItem(div.querySelector('.btn-add-item'));
    }

    // AJUSTE: Só salva se não estiver carregando o rascunho
    if (!carregandoRascunho) {
        salvarRascunho();
    }
}

function alternarTecidoManualGrupo(select) {
    const grupo = select.closest('.grupo-modelagem');
    const campoManual = grupo.querySelector('.i-tec-manual');
    ultimoTecidoSelecionado = select.value;

    if (select.value === "OUTRA") {
        campoManual.style.display = "block";
        campoManual.focus();
    } else {
        campoManual.style.display = "none";
        campoManual.value = ""; 
        ultimoTecidoManual = "";
    }
}

document.addEventListener('input', (e) => {
    if (carregandoRascunho) return; // Não salva enquanto o sistema preenche os campos sozinho
    
    if (e.target.classList.contains('i-tec-manual')) {
        ultimoTecidoManual = e.target.value;
    }
    salvarRascunho();
});

// Monitora mudanças em Selects (que não disparam 'input' em alguns navegadores)
document.addEventListener('change', (e) => {
    salvarRascunho();
});

function alternarCampoManual(select) {
    const campoManual = select.closest('.header-modelagem').querySelector('.i-mod-manual');
    if (select.value === "OUTRA") {
        campoManual.style.display = "block";
        campoManual.focus();
    } else {
        campoManual.style.display = "none";
        campoManual.value = ""; 
    }
}

function adicionarLinhaItem(botao) {
    const corpo = botao.closest('.grupo-modelagem').querySelector('.corpo-tabela-itens');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="i-nome" placeholder="Nome"></td>
        <td><input type="text" class="i-tam" placeholder="G" oninput="this.value = this.value.toUpperCase()"></td>
        <td><input type="text" class="i-num" placeholder="Nº"></td>
        <td><input type="number" class="i-qtd" value="1"></td>
        <td><input type="text" class="i-adicional" placeholder="Conjunto"></td>
        
<td><button type="button" class="btn-del" onclick="this.closest('tr').remove(); salvarRascunho();">✕</button></td>
    `;
    corpo.appendChild(tr);

    // AJUSTE DE SEGURANÇA:
    // Só dispara o salvamento se o usuário clicou no botão (não durante o carregamento)
    if (!carregandoRascunho) {
        salvarRascunho();
    }
}

function enviarPedido() {
    const nome = document.getElementById('clienteNome').value.trim();
    const fone = document.getElementById('clienteTelefone').value.trim();
    const obsGerais = document.getElementById('observacoesGerais').value.trim();
    
    if (!nome || !fone) {
        alert("Por favor, preencha Nome e WhatsApp.");
        return;
    }

    // Parte superior: Dados do Cliente com ícones
    let resumoHtml = `
        <div style="margin-bottom: 15px; padding-left: 5px;">
            <p style="margin: 4px 0;"><strong> Cliente:</strong> ${nome.toUpperCase()}</p>
            <p style="margin: 4px 0;"><strong> WhatsApp:</strong> ${fone}</p>
            ${obsGerais ? `<p style="margin: 4px 0; color: #64748b; font-size: 13px;"><strong> Obs:</strong> ${obsGerais}</p>` : ''}
        </div>
        <hr style="border:none; border-top: 1px dotted #e2e8f0; margin-bottom: 15px;">
    `;

    let temItemValido = false;
    const grupos = document.querySelectorAll('.grupo-modelagem');

    grupos.forEach(grupo => {
        const selectTec = grupo.querySelector('.i-tec-nome');
        const inputTecManual = grupo.querySelector('.i-tec-manual');
        let tecido = (selectTec.value === "OUTRA") ? inputTecManual.value : selectTec.value;
        
        const selectMod = grupo.querySelector('.i-mod-nome');
        const inputModManual = grupo.querySelector('.i-mod-manual');
        let modelagem = (selectMod.value === "OUTRA") ? inputModManual.value : selectMod.value;

        // Cabeçalho do Grupo e abertura da tabela com títulos em CAIXA ALTA
        resumoHtml += `
            <div class="resumo-header-grupo">
                <span style="font-weight: 800; color: #1e3a8a;">${(modelagem || 'MODELAGEM').toUpperCase()}</span>
                <span style="font-size: 12px; color: #2563eb; font-weight: 600;">🧵 ${(tecido || 'TECIDO').toUpperCase()}</span>
            </div>
            <div class="tabela-resumo-wrapper">
                <table class="resumo-tabela">
                    <thead>
                        <tr>
                            <th>QTD</th>
                            <th>ITEM / TAMANHO</th>
                            <th style="text-align:center;">Nº</th>
                            <th>ADICIONAL</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        grupo.querySelectorAll('.corpo-tabela-itens tr').forEach(row => {
            const item = row.querySelector('.i-nome').value.trim();
            const tam = row.querySelector('.i-tam').value.trim().toUpperCase();
            const num = row.querySelector('.i-num').value.trim();
            const qtd = row.querySelector('.i-qtd').value;
            const adicional = row.querySelector('.i-adicional').value.trim();

            if (item || tam) {
                temItemValido = true;
                
                // Se não tem nome, adiciona o rótulo "TAM:" para não ficar vazio
                const displayItem = item 
                    ? `<strong>${item.toUpperCase()}</strong> <span class="badge-tamanho">${tam}</span>`
                    : `<span style="color:#64748b; font-size:11px;">TAM:</span> <span class="badge-tamanho">${tam}</span>`;

                resumoHtml += `
                    <tr>
                        <td><span class="badge-qtd">${qtd}</span></td>
                        <td>${displayItem}</td>
                        <td style="text-align:center;" class="${!num ? 'vazio-tab' : ''}">${num || '-'}</td>
                        <td class="${!adicional ? 'vazio-tab' : ''}">${adicional || '-'}</td>
                    </tr>
                `;
            }
        });

        resumoHtml += `</tbody></table></div>`;
    });

    if (!temItemValido) {
        alert("Adicione pelo menos um item ao pedido.");
        return;
    }

    // Alimenta o modal e exibe
    const modal = document.getElementById('modal-conferencia');
    document.getElementById('resumo-pedido-html').innerHTML = resumoHtml;
    modal.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fecharConferencia() {
    document.getElementById('modal-conferencia').style.display = 'none';
}
function prepararNovoPedido() {
    localStorage.removeItem('rascunho_pedido');
    // 1. Limpa Cabeçalho
    document.getElementById('clienteNome').value = "";
    document.getElementById('clienteTelefone').value = "";
    document.getElementById('observacoesGerais').value = "";

    // 2. Reseta as Modelagens
    const container = document.getElementById('container-modelagens');
    container.innerHTML = ""; // Remove tudo
    
    // Limpa a memória do último tecido para começar do zero
    ultimoTecidoSelecionado = "";
    ultimoTecidoManual = "";

    // 3. Adiciona o primeiro grupo vazio novamente
    adicionarGrupoModelagem();

    // 4. Alterna as telas
    document.getElementById('tela-sucesso').style.display = 'none';
    document.getElementById('formulario-pedido').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

}


async function confirmarEEnviar() {
    const btnConfirmar = document.querySelector('#modal-conferencia .btn-main-green');
    
    if (!btnConfirmar) return;

    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "⏳ ENVIANDO...";

    const identificador = obterEmailVendedor();
    const nome = document.getElementById('clienteNome').value.trim();
    const fone = document.getElementById('clienteTelefone').value.trim();
    const obsGerais = document.getElementById('observacoesGerais').value.trim();

    try {
        let emailReal = "vendedor_geral@sistema.com"; 
        
        if (identificador) {
            const { data: perfil } = await _supabase
                .from('perfis_usuarios')
                .select('email_usuario')
                .ilike('email_usuario', `%${identificador}%`)
                .maybeSingle();
            
            if (perfil) emailReal = perfil.email_usuario;
            else emailReal = identificador;
        }

        let conteudo = `NOME;${nome.toUpperCase()}\n`;
        conteudo += `TELEFONE;${fone}\n`;
        conteudo += `OBS;${obsGerais}\n`;

        const grupos = document.querySelectorAll('.grupo-modelagem');
        grupos.forEach(grupo => {
            const selectTec = grupo.querySelector('.i-tec-nome');
            const inputTecManual = grupo.querySelector('.i-tec-manual');
            let tecidoFinal = (selectTec.value === "OUTRA") ? inputTecManual.value : selectTec.value;
            tecidoFinal = (tecidoFinal || "PADRÃO").toUpperCase();

            const selectMod = grupo.querySelector('.i-mod-nome');
            const inputManual = grupo.querySelector('.i-mod-manual');
            let nomeMod = (selectMod.value === "OUTRA") ? inputManual.value : selectMod.value;
            nomeMod = (nomeMod || "PADRÃO").replace(/;/g, "").trim().toUpperCase();

            grupo.querySelectorAll('.corpo-tabela-itens tr').forEach(row => {
                const itemRaw = row.querySelector('.i-nome').value.trim();
                const tam = row.querySelector('.i-tam').value.trim().toUpperCase();
                const qtd = row.querySelector('.i-qtd').value.trim();
                const num = row.querySelector('.i-num').value.trim();
                const adicional = row.querySelector('.i-adicional').value.trim();

                if (itemRaw !== "" || (tam !== "" && qtd !== "")) {
                    const nomeItem = itemRaw ? itemRaw.toUpperCase() : "";
                    conteudo += `${nomeItem};${tam};${num};${qtd};${adicional};${nomeMod};${tecidoFinal}\n`;
                }
            });
        });

        // ENVIO PARA O SUPABASE
        const { error } = await _supabase
            .from('pedidos_clientes')
            .insert([{ 
                cliente_email: emailReal, 
                conteudo_texto: conteudo, 
                status: 'pendente' 
            }]);
       
// ... dentro do try da confirmarEEnviar ...
if (error) throw error;

// Pegamos o que já existe para não perder os dados dos grupos
const rascunhoParaSalvar = JSON.parse(localStorage.getItem('rascunho_pedido') || "{}");
rascunhoParaSalvar.status = 'enviado_com_sucesso'; 

// Salva com o status para a tela de sucesso persistir no Refresh
localStorage.setItem('rascunho_pedido', JSON.stringify(rascunhoParaSalvar));



        // --- SUCESSO ---
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "✅ ENVIAR AGORA";

        // Transição de telas
        document.getElementById('modal-conferencia').style.display = 'none';
        document.getElementById('formulario-pedido').style.display = 'none';
        document.getElementById('tela-sucesso').style.display = 'block';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        console.error("Erro Supabase:", err);
        alert("Erro ao enviar pedido. Verifique sua conexão.");
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "✅ ENVIAR AGORA";
    }
}

function voltarParaEditar() {
    carregandoRascunho = true; // Trava o salvamento enquanto limpa

    const rascunhoAtual = JSON.parse(localStorage.getItem('rascunho_pedido') || "{}");
    if (rascunhoAtual.status) {
        delete rascunhoAtual.status;
        localStorage.setItem('rascunho_pedido', JSON.stringify(rascunhoAtual));
    }

    // Mostra as telas
    document.getElementById('tela-sucesso').style.display = 'none';
    document.getElementById('formulario-pedido').style.display = 'block';
    
    // Pequeno delay para garantir que o DOM está pronto antes de liberar o salvamento
    setTimeout(() => {
        carregandoRascunho = false;
    }, 500);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function enviarWhatsApp() {
    const nome = document.getElementById('clienteNome').value.trim().toUpperCase();
    const obsGerais = document.getElementById('observacoesGerais').value.trim();
    const empresa = document.getElementById('nome-empresa').innerText;

    let totalGeralPeças = 0;
    const div = "------------------------------------------";

    let msg = "*RESUMO DO PEDIDO*\n";
    msg += "EMPRESA: " + empresa + "\n";
    msg += "CLIENTE: " + nome + "\n";
    if (obsGerais) msg += "OBS: " + obsGerais + "\n";
    msg += div + "\n\n";

    const grupos = document.querySelectorAll('.grupo-modelagem');
    grupos.forEach(function(grupo) {
        const selectTec = grupo.querySelector('.i-tec-nome');
        const inputTecManual = grupo.querySelector('.i-tec-manual');
        let tecido = (selectTec.value === "OUTRA") ? inputTecManual.value : selectTec.value;
        
        const selectMod = grupo.querySelector('.i-mod-nome');
        const inputModManual = grupo.querySelector('.i-mod-manual');
        let modelagem = (selectMod.value === "OUTRA") ? inputModManual.value : selectMod.value;

        msg += "MODELO: " + (modelagem || 'PADRÃO').toUpperCase() + "\n";
        msg += "TECIDO: " + (tecido || 'PADRÃO').toUpperCase() + "\n";

        grupo.querySelectorAll('.corpo-tabela-itens tr').forEach(function(row) {
            const item = row.querySelector('.i-nome').value.trim().toUpperCase();
            const tam = row.querySelector('.i-tam').value.trim().toUpperCase();
            const num = row.querySelector('.i-num').value.trim();
            const qtdInput = row.querySelector('.i-qtd').value;
            const qtd = parseInt(qtdInput) || 0;
            const adicional = row.querySelector('.i-adicional').value.trim();

            if (item || tam || qtd > 0) {
                totalGeralPeças += qtd;
                
                // Formatação solicitada: > 1 un. - M - GILSON (N 99) [Camisa]
                let linha = " > " + qtd + " un. - " + (tam || "S/T");
                
                if (item) linha += " - " + item;
                if (num) linha += " (N " + num + ")";
                if (adicional) linha += " [" + adicional + "]";
                
                msg += linha + "\n";
            }
        });
        msg += "\n";
    });

    msg += div + "\n";
    msg += "TOTAL DE PEÇAS: " + totalGeralPeças + "\n";
    msg += "Gerado via Portal de Pedidos";

    const textoFinal = encodeURIComponent(msg);
    const linkZap = "https://wa.me/?text=" + textoFinal;

    window.open(linkZap, '_blank');
}

// --- FUNÇÕES DE RASCUNHO (SESSION STORAGE) ---



// A função salvarRascunho completa e corrigida:
function salvarRascunho() {
    if (carregandoRascunho) return; 

    const rascunho = {
        clienteNome: document.getElementById('clienteNome')?.value || "",
        clienteTelefone: document.getElementById('clienteTelefone')?.value || "",
        observacoesGerais: document.getElementById('observacoesGerais')?.value || "",
        grupos: []
    };

    const grupos = document.querySelectorAll('.grupo-modelagem');
    grupos.forEach(grupo => {
        const dadosGrupo = {
            tecido: grupo.querySelector('.i-tec-nome').value,
            tecidoManual: grupo.querySelector('.i-tec-manual').value,
            modelagem: grupo.querySelector('.i-mod-nome').value,
            modelagemManual: grupo.querySelector('.i-mod-manual').value,
            itens: []
        };

        grupo.querySelectorAll('.corpo-tabela-itens tr').forEach(row => {
            dadosGrupo.itens.push({
                nome: row.querySelector('.i-nome').value,
                tam: row.querySelector('.i-tam').value,
                num: row.querySelector('.i-num').value,
                qtd: row.querySelector('.i-qtd').value,
                adicional: row.querySelector('.i-adicional').value
            });
        });
        rascunho.grupos.push(dadosGrupo);
    });

    // SEMPRE LOCALSTORAGE PARA O CELULAR
    localStorage.setItem('rascunho_pedido', JSON.stringify(rascunho));
}

function restaurarRascunho() {
    const dadosSalvos = localStorage.getItem('rascunho_pedido');
    if (!dadosSalvos) return;

    const rascunho = JSON.parse(dadosSalvos);

    // Restaurar campos de texto simples
    if(document.getElementById('clienteNome')) document.getElementById('clienteNome').value = rascunho.clienteNome || "";
    if(document.getElementById('clienteTelefone')) document.getElementById('clienteTelefone').value = rascunho.clienteTelefone || "";
    if(document.getElementById('observacoesGerais')) document.getElementById('observacoesGerais').value = rascunho.observacoesGerais || "";

    const container = document.getElementById('container-modelagens');
    if (!container) return;
    
    // Limpa o container para reconstruir
    container.innerHTML = "";

    // SEGURANÇA: Se o rascunho não tem grupos, adiciona um vazio e para por aqui
    if (!rascunho.grupos || rascunho.grupos.length === 0) {
        adicionarGrupoModelagem(true);
        return;
    }

    // Se tem grupos, reconstrói um por um
    rascunho.grupos.forEach((g) => {
        // Criamos o grupo sem a linha padrão para inserir os dados do rascunho
        adicionarGrupoModelagem(false); 
        
        const gruposNoDOM = document.querySelectorAll('.grupo-modelagem');
        const ultimoGrupo = gruposNoDOM[gruposNoDOM.length - 1];

        // Seletores
        const selTec = ultimoGrupo.querySelector('.i-tec-nome');
        const selMod = ultimoGrupo.querySelector('.i-mod-nome');
        const inpTecM = ultimoGrupo.querySelector('.i-tec-manual');
        const inpModM = ultimoGrupo.querySelector('.i-mod-manual');
        
        // Aplica os valores dos Selects
        if(selTec) selTec.value = g.tecido || "";
        if(selMod) selMod.value = g.modelagem || "";
        
        // Restaura campos manuais (Outros) e a visibilidade deles
        if(inpTecM) {
            inpTecM.value = g.tecidoManual || "";
            inpTecM.style.display = g.tecido === 'OUTRA' ? 'block' : 'none';
        }
        if(inpModM) {
            inpModM.value = g.modelagemManual || "";
            inpModM.style.display = g.modelagem === 'OUTRA' ? 'block' : 'none';
        }

        // Reconstrói as linhas da tabela deste grupo
        const corpoTabela = ultimoGrupo.querySelector('.corpo-tabela-itens');
        if (corpoTabela && g.itens) {
            g.itens.forEach(it => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><input type="text" class="i-nome" value="${it.nome || ''}" placeholder="Nome"></td>
                    <td><input type="text" class="i-tam" value="${it.tam || ''}" placeholder="G" oninput="this.value = this.value.toUpperCase()"></td>
                    <td><input type="text" class="i-num" value="${it.num || ''}" placeholder="Nº"></td>
                    <td><input type="number" class="i-qtd" value="${it.qtd || 1}"></td>
                    <td><input type="text" class="i-adicional" value="${it.adicional || ''}" placeholder="Conjunto"></td>
                    <td><button type="button" class="btn-del" onclick="this.closest('tr').remove(); salvarRascunho();">✕</button></td>
                `;
                corpoTabela.appendChild(tr);
            });
        }
    });
}

// 1. Chama o modal em vez do confirm do navegador
function limparItensMantendoCliente() {
    document.getElementById('modal-limpar-confirmacao').style.display = 'flex';
}

// 2. Fecha o modal se o usuário desistir
function fecharModalLimpar() {
    document.getElementById('modal-limpar-confirmacao').style.display = 'none';
}

// 3. Ação real de limpeza (roda quando clica em "Sim, Limpar")
function executarLimpezaTotal() {
    // Limpa Observações
    const campoObs = document.getElementById('observacoesGerais');
    if (campoObs) campoObs.value = ""; 

    // Limpa Itens
    const container = document.getElementById('container-modelagens');
    if (container) container.innerHTML = ""; 

    // Reseta memórias e cria novo grupo
    ultimoTecidoSelecionado = "";
    ultimoTecidoManual = "";
    adicionarGrupoModelagem(true);

    // Salva e fecha
    salvarRascunho();
    fecharModalLimpar();
    
    // Rola para o topo do formulário
    window.scrollTo({ top: 150, behavior: 'smooth' });
}
// INICIALIZAÇÃO
carregarPerfil();
