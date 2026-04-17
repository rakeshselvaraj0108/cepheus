'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useTraffic } from '@/lib/TrafficContext';
import { Button } from '@/components/ui/Button';
import { Send, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// Simple markdown renderer
const MarkdownText = ({ content }: { content: string }) => {
    const renderMarkdown = (text: string) => {
        const parts: React.ReactElement[] = [];
        let key = 0;
        
        // Split by lines to handle lists and paragraphs
        const lines = text.split('\n');
        
        lines.forEach((line, lineIndex) => {
            // Handle bullet points
            if (line.trim().match(/^[-*]\s/)) {
                const content = line.replace(/^[-*]\s/, '');
                parts.push(
                    <div key={key++} className="flex gap-2 ml-4 my-1">
                        <span className="text-[--color-primary] mt-1">•</span>
                        <span>{processInlineMarkdown(content)}</span>
                    </div>
                );
            }
            // Handle numbered lists
            else if (line.trim().match(/^\d+\.\s/)) {
                const match = line.match(/^(\d+)\.\s(.*)/);
                if (match) {
                    parts.push(
                        <div key={key++} className="flex gap-2 ml-4 my-1">
                            <span className="text-[--color-primary] font-semibold min-w-[20px]">{match[1]}.</span>
                            <span>{processInlineMarkdown(match[2])}</span>
                        </div>
                    );
                }
            }
            // Handle headings
            else if (line.startsWith('### ')) {
                parts.push(
                    <h3 key={key++} className="text-lg font-bold mt-3 mb-2 text-[--color-primary]">
                        {line.replace(/^###\s/, '')}
                    </h3>
                );
            }
            else if (line.startsWith('## ')) {
                parts.push(
                    <h2 key={key++} className="text-xl font-bold mt-4 mb-2 text-[--color-primary]">
                        {line.replace(/^##\s/, '')}
                    </h2>
                );
            }
            // Regular paragraphs
            else if (line.trim()) {
                parts.push(
                    <p key={key++} className="my-2">
                        {processInlineMarkdown(line)}
                    </p>
                );
            }
            // Empty lines
            else if (lineIndex > 0) {
                parts.push(<div key={key++} className="h-2" />);
            }
        });
        
        return parts;
    };
    
    const processInlineMarkdown = (text: string): (string | React.ReactElement)[] => {
        const parts: (string | React.ReactElement)[] = [];
        let remaining = text;
        let key = 0;
        
        while (remaining) {
            // Bold: **text**
            const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
            if (boldMatch && boldMatch.index !== undefined) {
                if (boldMatch.index > 0) {
                    parts.push(remaining.substring(0, boldMatch.index));
                }
                parts.push(
                    <strong key={key++} className="font-bold text-white">
                        {boldMatch[1]}
                    </strong>
                );
                remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
                continue;
            }
            
            // Italic: *text*
            const italicMatch = remaining.match(/\*([^*]+)\*/);
            if (italicMatch && italicMatch.index !== undefined) {
                if (italicMatch.index > 0) {
                    parts.push(remaining.substring(0, italicMatch.index));
                }
                parts.push(
                    <em key={key++} className="italic">
                        {italicMatch[1]}
                    </em>
                );
                remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
                continue;
            }
            
            // Code: `text`
            const codeMatch = remaining.match(/`([^`]+)`/);
            if (codeMatch && codeMatch.index !== undefined) {
                if (codeMatch.index > 0) {
                    parts.push(remaining.substring(0, codeMatch.index));
                }
                parts.push(
                    <code key={key++} className="bg-black/30 px-1.5 py-0.5 rounded text-sm font-mono text-[--color-primary]">
                        {codeMatch[1]}
                    </code>
                );
                remaining = remaining.substring(codeMatch.index + codeMatch[0].length);
                continue;
            }
            
            // No more markdown, add remaining text
            parts.push(remaining);
            break;
        }
        
        return parts;
    };
    
    return <div className="space-y-1">{renderMarkdown(content)}</div>;
};

export default function AgentPage() {
    const router = useRouter();
    const { vehicles, zones, incidents } = useTraffic();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load chat history from localStorage on mount
    useEffect(() => {
        const savedMessages = localStorage.getItem('trafficmaxxer_chat_history');
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages));
            } catch (e) {
                console.error('Failed to load chat history:', e);
                setMessages([
                    {
                        role: 'assistant',
                        content: 'Hello! I\'m TrafficMaxxer AI, your expert routing and traffic management assistant. I have complete access to your fleet data, traffic zones, and incidents. How can I help you optimize your operations today?'
                    }
                ]);
            }
        } else {
            setMessages([
                {
                    role: 'assistant',
                    content: 'Hello! I\'m TrafficMaxxer AI, your expert routing and traffic management assistant. I have complete access to your fleet data, traffic zones, and incidents. How can I help you optimize your operations today?'
                }
            ]);
        }
    }, []);

    // Save chat history to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('trafficmaxxer_chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        
        // Quick local responses for common queries (instant, no API call needed)
        const inputLower = input.toLowerCase();
        const quickResponses: { [key: string]: () => string } = {
            'how many vehicles': () => `You have **${vehicles.length} vehicles** in your fleet. ${vehicles.filter(v => v.status === 'active').length} are currently active.`,
            'vehicle count': () => `**${vehicles.length} vehicles** total, ${vehicles.filter(v => v.status === 'active').length} active.`,
            'status': () => `**Fleet Status:**\n- Vehicles: ${vehicles.length} (${vehicles.filter(v => v.status === 'active').length} active)\n- Zones: ${zones.length} monitored\n- Incidents: ${incidents.length} reported`,
            'incidents': () => incidents.length > 0 
                ? `**${incidents.length} active incidents:**\n${incidents.slice(0, 5).map(i => `- ${i.type}`).join('\n')}`
                : 'No active incidents reported.',
            'help': () => '**Available commands:**\n- Ask about vehicles, routes, or traffic\n- Request route optimization\n- Check fuel status\n- View incident reports\n\nI can analyze your fleet data and provide recommendations!',
        };
        
        for (const [trigger, response] of Object.entries(quickResponses)) {
            if (inputLower.includes(trigger)) {
                setMessages(prev => [...prev, { role: 'assistant', content: response() }]);
                return;
            }
        }

        setIsLoading(true);

        try {
            // Send only essential data to reduce payload size
            const trafficData = {
                vehicles: vehicles.slice(0, 10).map(v => ({
                    name: v.name,
                    status: v.status,
                    fuel: v.fuel
                })),
                zones: zones.slice(0, 5).map(z => ({
                    name: z.name,
                    level: z.congestionLevel
                })),
                incidents: incidents.slice(0, 3).map(i => ({
                    type: i.type,
                    location: i.location
                }))
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages.slice(-6), userMessage].map(m => ({ role: m.role, content: m.content })),
                    trafficData
                })
            });

            const data = await response.json();

            if (data.error) {
                const errorMessage: Message = {
                    role: 'assistant',
                    content: data.error
                };
                setMessages(prev => [...prev, errorMessage]);
                setIsLoading(false);
                return;
            }

            const assistantMessage: Message = { 
                role: 'assistant', 
                content: data.message 
            };
            setMessages(prev => [...prev, assistantMessage]);

        } catch (error: any) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: `Connection error: ${error.message}. Please check your internet connection and try again.`
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const latestAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');

    const clearChat = () => {
        const initialMessage: Message = {
            role: 'assistant',
            content: 'Hello! I\'m TrafficMaxxer AI, your expert routing and traffic management assistant. I have complete access to your fleet data, traffic zones, and incidents. How can I help you optimize your operations today?'
        };
        setMessages([initialMessage]);
        localStorage.setItem('trafficmaxxer_chat_history', JSON.stringify([initialMessage]));
    };

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-[#0B0E14] via-[#1a1f2e] to-[#0B0E14]">
            <style jsx global>{`
                @keyframes breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                @keyframes glow-pulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(96, 165, 250, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(96, 165, 250, 0.6); }
                }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push('/dashboard')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearChat}
                        className="gap-2 text-red-400 hover:text-red-300"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear Chat
                    </Button>
                </div>
                <div className="text-xs font-mono text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    ONLINE
                </div>
            </div>

            {/* Main Content - Face to Face Layout */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                <div className="max-w-7xl w-full flex items-center gap-12">
                    {/* Large Avatar */}
                    <div className="flex-shrink-0">
                        <div className="relative" style={{ animation: 'breathe 4s ease-in-out infinite, glow-pulse 3s ease-in-out infinite' }}>
                            <Image 
                                src="/agent.png" 
                                alt="TrafficMaxxer AI" 
                                width={400} 
                                height={400}
                                className="rounded-full border-8 border-[--color-primary]/50"
                                priority
                            />
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[--color-primary] px-6 py-2 rounded-full">
                                <p className="text-white font-bold text-lg whitespace-nowrap">TrafficMaxxer AI</p>
                            </div>
                        </div>
                    </div>

                    {/* Conversation Area */}
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-4" style={{ maxHeight: '500px' }}>
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-3 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="flex-shrink-0 w-10 h-10">
                                            <Image 
                                                src="/agent.png" 
                                                alt="AI" 
                                                width={40} 
                                                height={40}
                                                className="rounded-full border-2 border-[--color-primary]/50"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                            message.role === 'user'
                                                ? 'bg-[--color-primary] text-white'
                                                : 'bg-white/5 border border-white/10 text-[--foreground]/90'
                                        }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <div className="text-base leading-relaxed">
                                                <MarkdownText content={message.content} />
                                            </div>
                                        ) : (
                                            <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                        )}
                                    </div>
                                    {message.role === 'user' && (
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[--color-primary]/20 flex items-center justify-center font-bold">
                                            U
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 justify-start">
                                    <div className="flex-shrink-0 w-10 h-10">
                                        <Image 
                                            src="/agent.png" 
                                            alt="AI" 
                                            width={40} 
                                            height={40}
                                            className="rounded-full border-2 border-[--color-primary]/50"
                                        />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-[--color-primary]" />
                                            <span className="text-sm text-[--foreground]/60">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* User Input */}
                        <div className="space-y-3">
                            <form onSubmit={handleSubmit} className="flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your question here..."
                                    disabled={isLoading}
                                    className="flex-1 bg-white/5 border-2 border-white/20 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/20 disabled:opacity-50 transition-all"
                                />
                                <Button 
                                    type="submit" 
                                    disabled={isLoading || !input.trim()}
                                    className="px-8 py-4 text-lg h-auto"
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                            <div className="text-xs text-[--foreground]/40 text-center">
                                {vehicles.length} active vehicles • {zones.length} zones monitored
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div ref={messagesEndRef} />
        </div>
    );
}
