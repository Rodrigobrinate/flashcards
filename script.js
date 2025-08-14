// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os elementos da página
    const apiKeyInput = document.getElementById('apiKeyInput');
    const temaInput = document.getElementById('temaInput');
    const gerarBtn = document.getElementById('gerarBtn');
    const imprimirBtn = document.getElementById('imprimirBtn');
    const loadingDiv = document.getElementById('loading');
    const flashcardsContainer = document.getElementById('flashcardsContainer');

    // Chave para armazenar a API Key no localStorage
    const LOCAL_STORAGE_API_KEY = 'geminiApiKey';

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
    
    // Função para chamar a API do Gemini (VERSÃO CORRIGIDA)
    const gerarFlashcardsComGemini = async (tema, apiKey) => {
        // Endpoint da API para o modelo Gemini Pro
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API: ${errorData.error.message}`);
            }

            const data = await response.json();
            const rawText = data.candidates[0].content.parts[0].text;

            // --- INÍCIO DA CORREÇÃO ---
            // Alguns modelos (como o flash) retornam o JSON dentro de um bloco de código Markdown.
            // Esta linha remove o "```json" do início e o "```" do final.
            const cleanedJsonText = rawText.replace(/^```json\s*|\s*```$/g, '');
            // --- FIM DA CORREÇÃO ---

            // Agora usamos o texto limpo para fazer o parse
            const parsedJson = JSON.parse(cleanedJsonText);
            return parsedJson.flashcards;

        } catch (error) {
            console.error('Falha ao gerar flashcards:', error);
            alert(`Ocorreu um erro: ${error.message}. Verifique sua chave de API, a resposta do modelo e a conexão com a internet.`);
            return null;
        }
    };


    // Função para exibir os flashcards na página
    const exibirFlashcards = (cards) => {
        flashcardsContainer.innerHTML = ''; // Limpa o conteúdo anterior
        if (!cards || cards.length === 0) {
            flashcardsContainer.innerHTML = '<p>Não foi possível gerar os flashcards.</p>';
            return;
        }

        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('flashcard');

            // Adiciona o conteúdo do flashcard
            cardElement.innerHTML = `
                <div class="frente">${card.frente}</div>
                <div class="verso">${card.verso}</div>
            `;

            flashcardsContainer.appendChild(cardElement);
        });
    };


    // Event listener para o botão de gerar
    gerarBtn.addEventListener('click', async () => {
        const tema = temaInput.value.trim();
        const apiKey = apiKeyInput.value.trim();

        if (!tema || !apiKey) {
            alert('Por favor, preencha o tema e a sua chave de API.');
            return;
        }

        // Salva a chave da API para uso futuro
        salvarChaveApi(apiKey);

        // Atualiza a interface para o estado de carregamento
        loadingDiv.classList.remove('hidden');
        gerarBtn.disabled = true;
        imprimirBtn.classList.add('hidden');
        flashcardsContainer.innerHTML = '';

        // Chama a função principal
        const flashcards = await gerarFlashcardsComGemini(tema, apiKey);

        // Esconde o carregamento e reativa o botão
        loadingDiv.classList.add('hidden');
        gerarBtn.disabled = false;

        if (flashcards) {
            exibirFlashcards(flashcards);
            imprimirBtn.classList.remove('hidden'); // Mostra o botão de imprimir
        }
    });

    // Event listener para o botão de imprimir
    imprimirBtn.addEventListener('click', () => {
        window.print();
    });

    // Carrega a chave da API ao iniciar a página
    carregarChaveApi();
});
