export const faqsData = [
    {
        question: "How does the AI securely access our documents?",
        answer: "We use a Retrieval-Augmented Generation (RAG) architecture. Documents are securely processed, chunked, and stored as embeddings in a private vector database. The AI only retrieves relevant chunks at inference time, ensuring data privacy."
    },
    {
        question: "What document formats do you support?",
        answer: "Our platform supports a wide range of formats including PDF, DOCX, PPTX, TXT, Markdown, CSV, and Excel, allowing you to centralize your entire knowledge base."
    },
    {
        question: "Is the AI hallucinating or making up answers?",
        answer: "Our RAG implementation heavily mitigates hallucinations by grounding all AI responses in your actual uploaded documents. The AI provides exact source citations for every claim it makes."
    },
    {
        question: "Can we deploy this on our own infrastructure?",
        answer: "Yes! Our Enterprise plan supports private on-premise deployments utilizing local Ollama instances and custom vector databases, ensuring your data never leaves your network."
    },
    {
        question: "How do roles and permissions work?",
        answer: "We offer granular role-based access control (RBAC). You can assign users to specific departments or tags, ensuring that sensitive documents are only queryable by authorized personnel."
    }
];