// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os elementos da página
    const apiKeyInput = document.getElementById('apiKeyInput');
    const temaInput = document.getElementById('temaInput');
    const gerarBtn = document.getElementById('gerarBtn');
    const imprimirBtn = document.getElementById('imprimirBtn');
    const ankiBtn = document.getElementById('ankiBtn'); // Novo botão Anki
    const loadingDiv = document.getElementById('loading');
    const flashcardsContainer = document.getElementById('flashcardsContainer');

    // Chave para armazenar a API Key no localStorage
    const LOCAL_STORAGE_API_KEY = 'geminiApiKey';
    
    // Variável para armazenar os cards gerados
    let generatedCards = [];

    // Função para carregar a chave da API do localStorage
    const carregarChaveApi = () => {
        const savedKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
        if (savedKey) {
            apiKeyInput.value = savedKey;
        }
    };

    // Função para salvar a chave da API no localStorage
    const salvarChaveApi = (key) => {
        localStorage.setItem(LOCAL_STORAGE_API_KEY, key);
    };
    
    // Função para chamar a API do Gemini
    const gerarFlashcardsComGemini = async (tema, apiKey) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const prompt = `
            Você é um assistente educacional. Crie exatamente 10 flashcards sobre o tema "${tema}".
            Cada flashcard deve ter uma pergunta/termo (frente) e uma resposta/definição (verso).
            Sua resposta DEVE ser um objeto JSON válido, contendo uma única chave "flashcards" que é um array de 10 objetos.
            Cada objeto no array deve ter duas chaves: "frente" e "verso".
            Não inclua nenhum texto, explicação ou formatação markdown antes ou depois do objeto JSON.
            Exemplo de formato esperado:
            {
              "flashcards": [
                {
                  "frente": "Pergunta 1",
                  "verso": "Resposta 1"
                },
                {
                  "frente": "Pergunta 2",
                  "verso": "Resposta 2"
                }
              ]
            }
        `;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API: ${errorData.error.message}`);
            }
            const data = await response.json();
            const rawText = data.candidates[0].content.parts[0].text;
            const cleanedJsonText = rawText.replace(/^```json\s*|\s*```$/g, '');
            const parsedJson = JSON.parse(cleanedJsonText);
            return parsedJson.flashcards;
        } catch (error) {
            console.error('Falha ao gerar flashcards:', error);
            alert(`Ocorreu um erro: ${error.message}. Verifique sua chave de API e a conexão.`);
            return null;
        }
    };

    // Função para exibir os flashcards na página
    const exibirFlashcards = (cards) => {
        flashcardsContainer.innerHTML = ''; 
        if (!cards || cards.length === 0) {
            flashcardsContainer.innerHTML = '<p>Não foi possível gerar os flashcards.</p>';
            return;
        }
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('flashcard');
            cardElement.innerHTML = `
                <div class="frente">${card.frente}</div>
                <div class="verso">${card.verso}</div>
            `;
            flashcardsContainer.appendChild(cardElement);
        });
    };
    
    // --- NOVA FUNÇÃO PARA EXPORTAR PARA O ANKI ---
    const exportarParaAnki = () => {
        if (generatedCards.length === 0) {
            alert("Nenhum card para exportar. Gere os flashcards primeiro.");
            return;
        }

        // Usamos ponto e vírgula como separador, que é um padrão comum e seguro.
        const separador = ';';
        
        // Converte cada card para uma linha do CSV
        const csvRows = generatedCards.map(card => {
            // Para evitar quebras no CSV, colocamos os campos entre aspas duplas
            // e substituímos aspas duplas internas por duas aspas duplas.
            const frente = `"${card.frente.replace(/"/g, '""')}"`;
            const verso = `"${card.verso.replace(/"/g, '""')}"`;
            return `${frente}${separador}${verso}`;
        });

        // Junta todas as linhas com uma quebra de linha
        const csvContent = csvRows.join('\n');

        // Cria um objeto Blob para o arquivo
        // \uFEFF é o BOM (Byte Order Mark) para garantir que o UTF-8 seja reconhecido corretamente
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Cria um link temporário para iniciar o download
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        
        // Cria um nome de arquivo dinâmico
        const temaDoArquivo = temaInput.value.trim().replace(/\s+/g, '_').toLowerCase();
        link.setAttribute("download", `flashcards_${temaDoArquivo || 'export'}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Event listener para o botão de gerar
    gerarBtn.addEventListener('click', async () => {
        const tema = temaInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        if (!tema || !apiKey) {
            alert('Por favor, preencha o tema e a sua chave de API.');
            return;
        }
        salvarChaveApi(apiKey);
        
        loadingDiv.classList.remove('hidden');
        gerarBtn.disabled = true;
        imprimirBtn.classList.add('hidden');
        ankiBtn.classList.add('hidden'); // Esconde o botão Anki
        flashcardsContainer.innerHTML = '';
        generatedCards = []; // Limpa os cards antigos

        const flashcards = await gerarFlashcardsComGemini(tema, apiKey);

        loadingDiv.classList.add('hidden');
        gerarBtn.disabled = false;

        if (flashcards) {
            generatedCards = flashcards; // Armazena os cards gerados
            exibirFlashcards(flashcards);
            imprimirBtn.classList.remove('hidden');
            ankiBtn.classList.remove('hidden'); // Mostra o botão Anki
        }
    });

    // Event listener para o botão de imprimir
    imprimirBtn.addEventListener('click', () => {
        window.print();
    });
    
    // Event listener para o novo botão Anki
    ankiBtn.addEventListener('click', exportarParaAnki);

    // Carrega a chave da API ao iniciar a página
    carregarChaveApi();
});
