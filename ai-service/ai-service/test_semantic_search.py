from semantic_search import SemanticSearch


def test_semantic_search():
    documents = {
        "doc1": "The sky is blue and beautiful.",
        "doc2": "Love this blue and beautiful sky!",
        "doc3": "The quick brown fox jumps over the lazy dog.",
        "doc4": "A king's breakfast has sausages, ham, bacon, eggs, toast, and beans",
        "doc5": "I love green eggs, ham, sausages and bacon!",
        "doc6": "The green grass is green, but the sky is blue.",
    }

    search_engine = SemanticSearch()
    search_engine.add_documents(documents)

    query = "What does a king eat for breakfast?"
    results = search_engine.search(query)

    for result in results:
        print(f"Document: {result['document']}")
        print(f"Similarity: {result['similarity']:.2f}")
        print(f"Snippet: {result['snippet']}\n")


if __name__ == "__main__":
    test_semantic_search()
