// CONFIGURAÇÕES DO SUPABASE
const SUPABASE_URL = 'https://kvhvelquxtcxukpkdabg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aHZlbHF1eHRjeHVrcGtkYWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MTk0MDAsImV4cCI6MjA4NDI5NTQwMH0.gVCU4i1M5GGR96bDHExFBMKuDOcpl7khj10zycbky-U';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let listaModelagens = [];
let listaTecidos = []; 

// Variáveis de memória para manter o tecido selecionado no próximo grupo
let ultimoTecidoSelecionado = "";
let ultimoTecidoManual = "";

function obterEmailVendedor() {
    const urlAtual = window.location.href;
    const params = new URLSearchParams(window.location.search);
    let vendedorId = params.get('id') || params.get('atendente');

    if (!vendedorId && urlAtual.includes('id=')) {
        vendedorId = urlAtual.split('id=')[1].split('&')[0];
    }

    return vendedorId ? vendedorId.trim().toLowerCase() : null;
}

async function carregarPerfil() {
    const identificador = obterEmailVendedor();
    if (identificador) {
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
    } else {
        if(document.getElementById('nome-empresa')) document.getElementById('nome-empresa').innerText = "Link de Acesso Inválido";
    }
    adicionarGrupoModelagem();
}

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

function adicionarGrupoModelagem() {
    const container = document.getElementById('container-modelagens');
    
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
                <select class="i-tec-nome" onchange="alternarTecidoManualGrupo(this)" style="font-weight: bold;">
                    ${gerarOpcoesTecido()}
                </select>
                <input type="text" class="i-tec-manual" placeholder="Qual o nome do tecido?" 
                       value="${ultimoTecidoManual}"
                       style="display:${ultimoTecidoSelecionado === 'OUTRA' ? 'block' : 'none'}; margin-top: 10px; border-style: dashed; border-color: #3b82f6;">
            </div>

            <label class="label-modelagem">Modelagem</label>
            <div class="row-modelagem">
                <select class="i-mod-nome" onchange="alternarCampoManual(this)" style="font-weight: bold;">
                    ${opcoesModHtml}
                </select>
                <button type="button" class="btn-del-header" onclick="this.closest('.grupo-modelagem').remove()">✕</button>
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
    adicionarLinhaItem(div.querySelector('.btn-add-item'));
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

// Monitora digitação manual para salvar na memória
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('i-tec-manual')) {
        ultimoTecidoManual = e.target.value;
    }
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
        <td><button class="btn-del" onclick="this.closest('tr').remove()">✕</button></td>
    `;
    corpo.appendChild(tr);
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

        if (error) throw error;

        // --- SUCESSO ---
        // Destravamos o botão para caso o usuário volte para editar depois
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
    // Esconde a tela de sucesso
    document.getElementById('tela-sucesso').style.display = 'none';
    
    // Mostra o formulário de pedido novamente com os dados preservados
    document.getElementById('formulario-pedido').style.display = 'block';
    
    // Rola a página suavemente para o início
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

// INICIALIZAÇÃO
carregarPerfil();
