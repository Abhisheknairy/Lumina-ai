from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import CHROMA_PERSIST_DIR, GOOGLE_API_KEY
from core.state import chat_histories
from core.logger import logger

# Initialize AI tools once
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY, temperature=0.3)

def chunk_and_store_documents(all_documents):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks, metadatas = [], []
    for doc in all_documents:
        split_texts = text_splitter.split_text(doc["text"])
        chunks.extend(split_texts)
        metadatas.extend([doc["metadata"]] * len(split_texts))
        
    if chunks:
        Chroma.from_texts(texts=chunks, embedding=embeddings, metadatas=metadatas, persist_directory=CHROMA_PERSIST_DIR)
        return len(chunks)
    return 0

def process_chat_query(user_id, question):
    if user_id not in chat_histories:
        chat_histories[user_id] = []
        
    history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in chat_histories[user_id]])
    
    vector_store = Chroma(persist_directory=CHROMA_PERSIST_DIR, embedding_function=embeddings)
    docs = vector_store.similarity_search(query=question, k=4, filter={"user_id": user_id})
    
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs]) if docs else "No relevant documents found."
    
    prompt = f"History: {history_text}\nContext: {context_text}\nQuestion: {question}"
    response = llm.invoke(prompt)
    
    chat_histories[user_id].append({"role": "Human", "content": question})
    chat_histories[user_id].append({"role": "AI", "content": response.content})
    if len(chat_histories[user_id]) > 10: 
        chat_histories[user_id] = chat_histories[user_id][-10:]
        
    sources = list(set([doc.metadata.get("source") for doc in docs]))
    return response.content, sources