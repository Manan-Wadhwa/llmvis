document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const submitButton = document.getElementById('submitButton');
    const progressionTableBody = document.getElementById('progressionTableBody');
    const layerVisualizationContainer = document.getElementById('layerVisualization');
    const topWordsContainer = document.getElementById('topWordsContainer');

    submitButton.addEventListener('click', async () => {
        const text = inputText.value.trim();

        if (!text) {
            alert('Please enter some text for analysis');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Analyzing...';
        progressionTableBody.innerHTML = '';
        layerVisualizationContainer.innerHTML = '';
        topWordsContainer.innerHTML = '';

        try {
            const response = await fetch('/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();
            console.log('Full response:', data);

            if (data.success) {
                // Layer Progression Table
                data.layer_progression.forEach(layer => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${layer.layer}</td>
                        <td>${layer.avg_value}</td>
                        <td>${layer.std_value}</td>
                        <td>${layer.importance}</td>
                    `;
                    progressionTableBody.appendChild(row);
                });

                // Layer Visualization
                data.normalized_importances.forEach((importance, index) => {
                    const circle = document.createElement('div');
                    circle.classList.add('layer-circle');
                    circle.style.backgroundColor = `rgba(0, 0, 255, ${importance})`;
                    circle.title = `Layer ${index + 1} Importance: ${importance.toFixed(2)}`;
                    layerVisualizationContainer.appendChild(circle);
                });

                // Top Words
                const topWordsTitle = document.createElement('h4');
                topWordsTitle.textContent = 'Most Probable Next Words';
                topWordsContainer.appendChild(topWordsTitle);

                const topWordsList = document.createElement('ul');
                data.top_words.forEach(wordData => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <strong>${wordData.word}</strong> 
                        (Probability: ${(wordData.probability * 100).toFixed(2)}%)
                    `;
                    topWordsList.appendChild(listItem);
                });
                topWordsContainer.appendChild(topWordsList);

            } else {
                console.error('Backend error:', data.message);
                alert(data.message || 'Error processing text');
            }
        } catch (error) {
            console.error('Network or parsing error:', error);
            alert('An unexpected error occurred while processing the text');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Analyze Layer Progression';
        }
    });
});