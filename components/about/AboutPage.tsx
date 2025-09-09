

import React from 'react';
import Icon, { MenuIcon, BrainCircuitIcon, SparklesIcon, GlobeAltIcon, ShieldCheckIcon } from '../common/Icon';

interface AboutPageProps {
    onToggleHistory: () => void;
}

const FeatureCard: React.FC<{ icon: React.FC<any>, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center mb-4">
            <Icon icon={icon} className="w-8 h-8 mr-4 text-gray-700 dark:text-gray-300"/>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {children}
        </p>
    </div>
);


const AboutPage: React.FC<AboutPageProps> = ({ onToggleHistory }) => {
  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center shrink-0 bg-white dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
            <button onClick={onToggleHistory} className="p-2 -ml-2 mr-2 text-gray-500 dark:text-gray-400">
                <Icon icon={MenuIcon} className="w-6 h-6"/>
            </button>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">About StefanGPT</h2>
        </header>

        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8 space-y-12">
                
                <section id="intro">
                    <h1 className="text-5xl font-extrabold mb-4 text-center text-gray-900 dark:text-white">Welcome to StefanGPT</h1>
                    <p className="text-xl text-center text-gray-600 dark:text-gray-300 leading-relaxed">
                        StefanGPT is more than just a chatbot; it's a multifaceted AI assistant engineered to be your partner in creativity, knowledge exploration, and problem-solving. Created by developer Progi, this platform is built on the philosophy that artificial intelligence should be personal, powerful, and private. Whether you're a developer seeking code snippets, a writer battling creative block, a student researching a complex topic, or simply a curious mind, StefanGPT is designed to understand your needs and provide intelligent, relevant, and secure assistance.
                    </p>
                    <p className="text-lg text-center text-gray-600 dark:text-gray-400 mt-4">
                        Our mission is to provide a uniquely tailored AI experience that remembers your conversations, protects your data with a local-first approach, and extends your capabilities with integrated tools for image generation and web search. This isn't just another language model; it's your personal AI, ready to assist with your next big idea.
                    </p>
                </section>

                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                <section id="features">
                    <h2 className="text-4xl font-bold mb-8 text-center">Core Features at a Glance</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FeatureCard icon={BrainCircuitIcon} title="Conversational Intelligence">
                            At its heart, StefanGPT excels in understanding and participating in nuanced conversations. Powered by Google's advanced Gemini model, it can follow complex instructions, recall previous points in a discussion, and generate human-like text that is both coherent and contextually aware. This allows for a natural, flowing dialogue, making your interactions more intuitive and productive.
                        </FeatureCard>
                        <FeatureCard icon={SparklesIcon} title="Limitless Creativity">
                            Bring your ideas to life with our integrated AI image finder. By simply typing a command like <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">generate a futuristic cityscape</code>, you can find a unique, high-quality photo from a vast library that matches your description. This tool, powered by the Unsplash API, is perfect for writers seeking inspiration or presenters needing custom visuals. All found images are saved to your personal library for easy access.
                        </FeatureCard>
                        <FeatureCard icon={GlobeAltIcon} title="Real-Time Knowledge">
                            While many AIs are limited by their training data, StefanGPT can access up-to-date information from the web. Using commands like <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">search for recent AI developments</code>, you get answers grounded in the latest search results, complete with citations and links to the source material. This ensures your information is timely, verifiable, and reliable for research and learning.
                        </FeatureCard>
                        <FeatureCard icon={ShieldCheckIcon} title="Privacy-First Philosophy">
                            We believe your conversations are your own. StefanGPT is designed with a robust, privacy-centric architecture. Your user account and all chat sessions are stored securely in your browser's local storage, not on a central server. This means you have full control over your data. We do not see, store, or analyze your conversations, ensuring a completely private and secure AI experience.
                        </FeatureCard>
                    </div>
                </section>

                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                
                <section id="technology">
                     <h2 className="text-4xl font-bold mb-6 text-center">The Technology Powering Your Assistant</h2>
                     <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-gray-700 dark:text-gray-300 space-y-4 leading-loose">
                        <p>StefanGPT stands on the shoulders of giants, integrating cutting-edge technologies to deliver a seamless and powerful user experience. The application is crafted as a modern single-page application (SPA) using <strong>React</strong>, a leading JavaScript library for building dynamic user interfaces. This ensures the app is fast, responsive, and works flawlessly across all your devices.</p>
                        <p>The core conversational and generative abilities are powered by the <strong>Google Gemini API</strong>. For chat, we use the 'gemini-2.5-flash' model, which offers a state-of-the-art balance of speed and intelligence. The application uses the official Google GenAI SDK directly on the client-side, with the API key managed securely as an environment variable.</p>
                        <p>For finding images, we leverage the power of the <strong>Unsplash API</strong>. This service provides a massive library of high-quality, royalty-free photos. When you ask for an image, the app sends the request to a secure Netlify Function which finds a relevant image, ensuring a great result without needing an extra API key. The found image is then saved to your private, local library.</p>
                        <p>Finally, our commitment to privacy is cemented by our use of the browser's <strong>localStorage</strong>. By storing all user data—from account credentials to entire chat histories—directly on your device, we give you sovereign control. This decentralized approach is fundamental to our design and guarantees that your interactions with StefanGPT remain confidential.</p>
                     </div>
                </section>
                
                 <div className="border-t border-gray-200 dark:border-gray-700"></div>

                <section id="creator">
                    <h2 className="text-4xl font-bold mb-6 text-center">A Message from the Creator, Progi</h2>
                    <div className="flex flex-col md:flex-row items-center bg-gray-50 dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                        <div className="text-center md:text-left md:mr-8">
                            <p className="text-lg text-gray-600 dark:text-gray-300 italic leading-relaxed">
                                "I created StefanGPT out of a passion for building tools that empower people. I envisioned an AI assistant that wasn't just a generic utility but a true partner—one that is smart, adaptable, and, most importantly, trustworthy. The goal was to combine the incredible power of modern language models with a user-centric design that prioritizes privacy and personalization. Every feature, from the local data storage to the open-source integrations, was chosen to put the user in control. This project is a testament to the idea that powerful AI can be accessible and secure. I hope StefanGPT helps you learn, create, and explore in ways you never thought possible."
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    </div>
  );
};

export default AboutPage;