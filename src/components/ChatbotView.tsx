import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Compass,
  Activity,
  AlertTriangle,
  HardDrive,
  Calendar,
  Layers,
  HelpCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import type { ChatMessage, ChatGraphData } from '../types.ts';

export const ChatbotView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Greetings. I am Sentinal, the dedicated AI Assistant for Mine Sentinel. I know all details about this application, its hardware sensors, safety thresholds, and I have direct access to our real-time and historical SQLite database.\n\nYou can query app features, node telemetry, inspect alert logs, or request interactive graphs directly in this chat. (Note: I am strictly dedicated to Mine Sentinel and cannot answer unrelated questions).`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.text || 'Telemetry response received.',
        graph: data.graph,
        toolsUsed: data.toolsUsed,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'Error contacting Mine Sentinel telemetry backend. Please try again.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = [
    'What is the current status of NODE-001?',
    'Show me the tilt graph for NODE-001 on 25 August 2026',
    'Show NODE-002 vibration for September 1',
    'Show tilt and vibration from 20 August to 30 August',
    'Which device has the highest vibration?',
    'How many danger alerts happened this week?',
    'Where is NODE-001 located?',
    'What is the recipe for chocolate cake?' // To demonstrate Section 19 guardrail rejection
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-h-[850px] bg-[#121316] border border-[#26282e] rounded overflow-hidden shadow-md">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0a0a0b] border-b border-[#26282e] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5 text-[#F27D26]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB]">
                Sentinal — Mine Geotechnical Assistant
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
                DB-Grounded
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Controlled database tool execution & in-chat interactive chart rendering
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#8E9299]">
          <span className="w-2 h-2 rounded-full bg-[#00D26A] animate-pulse"></span>
          Sentinal Ready
        </div>
      </div>

      {/* Suggested prompts bar */}
      <div className="px-4 py-2 bg-[#0a0a0b] border-b border-[#26282e] overflow-x-auto flex items-center gap-2 text-xs font-mono scrollbar-thin">
        <span className="text-[10px] text-[#8E9299] uppercase shrink-0 font-bold">Quick Inquiries:</span>
        {examplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(p)}
            className="px-2.5 py-1 rounded bg-[#18191d] hover:bg-[#26282e] border border-[#26282e] hover:border-[#F27D26]/50 text-[#8E9299] hover:text-[#E4E7EB] text-nowrap transition-colors cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-mono font-bold ${
                msg.sender === 'user'
                  ? 'bg-[#F27D26] text-[#0a0a0b]'
                  : 'bg-[#18191d] text-[#F27D26] border border-[#26282e]'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`rounded p-3.5 text-xs font-mono leading-relaxed space-y-2.5 shadow-md ${
                msg.sender === 'user'
                  ? 'bg-[#F27D26] text-[#0a0a0b] font-medium'
                  : 'bg-[#18191d] border border-[#26282e] text-[#E4E7EB] w-full max-w-2xl'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* In-chat interactive graph (Section 21) */}
              {msg.graph && msg.graph.data && msg.graph.data.length > 0 && (
                <div className="mt-3 p-3 rounded bg-[#121316] border border-[#26282e] text-[#E4E7EB]">
                  <div className="flex items-center justify-between border-b border-[#26282e] pb-2 mb-3">
                    <span className="font-bold text-[#F27D26] uppercase flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      {msg.graph.title || `${msg.graph.device_id} Analysis`}
                    </span>
                    <span className="text-[10px] text-[#8E9299]">
                      {msg.graph.data.length} Points Recorded
                    </span>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={msg.graph.data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#26282e" />
                        <XAxis dataKey="time" stroke="#8E9299" fontSize={10} tickLine={false} />
                        <YAxis stroke="#8E9299" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#151619',
                            borderColor: '#26282e',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#E4E7EB'
                          }}
                        />
                        <Legend />
                        {(msg.graph.type === 'tilt' || msg.graph.type === 'combined') && (
                          <Line
                            type="monotone"
                            dataKey="tilt"
                            name="Tilt Mag (°)"
                            stroke="#F27D26"
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                        {(msg.graph.type === 'vibration' || msg.graph.type === 'combined') && (
                          <Line
                            type="monotone"
                            dataKey="vibration"
                            name="Vibration"
                            stroke="#00D26A"
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                        {msg.graph.type === 'risk' && (
                          <Line
                            type="monotone"
                            dataKey="risk_score"
                            name="Risk Score"
                            stroke="#FF3B30"
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tools executed indicator */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="pt-2 border-t border-[#26282e] text-[10px] text-[#8E9299] flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-[#00D26A]" />
                  <span>DB Grounding: {msg.toolsUsed.join(', ')}</span>
                </div>
              )}

              <div
                className={`text-[9px] ${
                  msg.sender === 'user' ? 'text-[#0a0a0b]/70 text-right' : 'text-[#8E9299]'
                }`}
              >
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-md items-center">
            <div className="w-8 h-8 rounded bg-[#18191d] text-[#F27D26] border border-[#26282e] flex items-center justify-center text-xs font-mono">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#18191d] border border-[#26282e] rounded px-4 py-2.5 text-xs font-mono text-[#8E9299] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F27D26] animate-pulse"></span>
              Sentinal analyzing mine database...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 bg-[#0a0a0b] border-t border-[#26282e]">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Ask Sentinal about app features, node telemetry, historical records, or request graphs..."
            className="flex-1 bg-[#18191d] border border-[#26282e] text-[#E4E7EB] placeholder-[#8E9299] text-xs font-mono rounded px-4 py-3 focus:outline-none focus:border-[#F27D26]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="px-4 py-3 rounded bg-[#F27D26] hover:bg-[#ff9142] disabled:opacity-50 text-[#0a0a0b] font-bold font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask Sentinal</span>
          </button>
        </form>
      </div>
    </div>
  );
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
