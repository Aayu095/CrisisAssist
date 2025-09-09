'use client';

import { Shield, Zap, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDescopeSession } from '@/hooks/useDescopeSession';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useDescopeSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-yellow-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-blue-200 to-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CrisisAssist</h1>
                <p className="text-xs text-gray-500">Emergency Response System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/login"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-100 to-blue-100 text-emerald-800 rounded-full text-sm font-medium mb-6">
            🚀 AI-Powered Crisis Management Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Secure Multi-Agent
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block animate-pulse">Emergency Response</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Coordinate disaster response with AI agents that communicate securely, 
            schedule resources automatically, and notify communities instantly—all 
            powered by Descope's advanced authentication.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="btn-primary text-lg px-8 py-3"
            >
              Launch Dashboard
            </Link>
            <Link
              href="/demo"
              className="btn-secondary text-lg px-8 py-3"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 relative z-10">
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 card-hover group">
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Alert Agent</h3>
            <p className="text-gray-600 text-sm">
              Processes disaster alerts, analyzes risk levels, and determines response actions automatically.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 card-hover group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Scheduler Agent</h3>
            <p className="text-gray-600 text-sm">
              Creates calendar events, allocates resources, and coordinates relief efforts with Google Calendar.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 card-hover group">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifier Agent</h3>
            <p className="text-gray-600 text-sm">
              Sends verified alerts via Slack, SMS, and email to communities and stakeholders.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 card-hover group">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifier Agent</h3>
            <p className="text-gray-600 text-sm">
              Validates content, prevents misinformation, and ensures only authorized communications.
            </p>
          </div>
        </div>

        {/* Interactive Demo Flow */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-16 relative z-10 overflow-hidden">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Interactive Emergency Response Demo
            </h2>
            <p className="text-gray-600 mb-6">
              Click to simulate a real emergency response workflow
            </p>
            <button className="btn-primary px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              🚨 Start Emergency Simulation
            </button>
          </div>

          <div className="grid md:grid-cols-5 gap-4 relative">
            {/* Animated connection lines */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full">
                <defs>
                  <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <path d="M 80 50 Q 200 30 320 50 Q 440 70 560 50 Q 680 30 800 50" 
                      stroke="url(#flowGradient)" 
                      strokeWidth="3" 
                      fill="none" 
                      className="animate-pulse" />
              </svg>
            </div>

            <div className="text-center group cursor-pointer" onClick={() => console.log('Alert triggered')}>
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl group-hover:scale-125 transition-all duration-500 relative">
                <span className="text-3xl animate-bounce">🚨</span>
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></div>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Alert Triggered</h4>
              <p className="text-sm text-gray-600">Earthquake detected in Mumbai</p>
              <div className="flex justify-center mt-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-red-300 to-blue-300 rounded-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-red-500 to-blue-500 rounded-full animate-pulse opacity-70"></div>
                <div className="absolute top-0 left-0 w-4 h-full bg-white rounded-full animate-bounce"></div>
              </div>
            </div>

            <div className="text-center group cursor-pointer" onClick={() => console.log('Analysis started')}>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl group-hover:scale-125 transition-all duration-500 relative">
                <span className="text-3xl animate-spin">🧠</span>
                <div className="absolute inset-0 rounded-full bg-purple-400 animate-pulse opacity-20"></div>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">AI Analysis</h4>
              <p className="text-sm text-gray-600">Risk assessment & planning</p>
              <div className="flex justify-center mt-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-lg"></div>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-purple-300 to-blue-300 rounded-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse opacity-70"></div>
                <div className="absolute top-0 left-0 w-4 h-full bg-white rounded-full animate-bounce animation-delay-1000"></div>
              </div>
            </div>

            <div className="text-center group cursor-pointer" onClick={() => console.log('Event scheduled')}>
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl group-hover:scale-125 transition-all duration-500 relative">
                <span className="text-3xl animate-pulse">📅</span>
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Event Scheduled</h4>
              <p className="text-sm text-gray-600">Relief camp organized</p>
              <div className="flex justify-center mt-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg"></div>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-blue-300 to-green-300 rounded-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full animate-pulse opacity-70"></div>
                <div className="absolute top-0 left-0 w-4 h-full bg-white rounded-full animate-bounce animation-delay-2000"></div>
              </div>
            </div>

            <div className="text-center group cursor-pointer" onClick={() => console.log('Notifications sent')}>
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl group-hover:scale-125 transition-all duration-500 relative">
                <span className="text-3xl animate-bounce">📢</span>
                <div className="absolute inset-0 rounded-full bg-green-400 animate-pulse opacity-30"></div>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Alert Sent</h4>
              <p className="text-sm text-gray-600">Community notified</p>
              <div className="flex justify-center mt-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
              </div>
            </div>
          </div>

          {/* Real-time metrics */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
              <div className="text-2xl font-bold text-red-600 animate-pulse">2.3s</div>
              <div className="text-sm text-red-700">Response Time</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 animate-pulse">4/4</div>
              <div className="text-sm text-blue-700">Agents Active</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="text-2xl font-bold text-green-600 animate-pulse">99.9%</div>
              <div className="text-sm text-green-700">Success Rate</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 animate-pulse">1,247</div>
              <div className="text-sm text-purple-700">Lives Saved</div>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 rounded-2xl text-white p-8 mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-primary-100 mb-8">
              Built with Descope's advanced authentication and authorization system
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Scoped Tokens</h4>
                <p className="text-primary-100 text-sm">
                  Each agent has minimal required permissions
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Delegated Trust</h4>
                <p className="text-primary-100 text-sm">
                  Secure agent-to-agent communication
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Audit Trail</h4>
                <p className="text-primary-100 text-sm">
                  Complete token usage and action history
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Emergency Response?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join the future of coordinated disaster management with secure, 
            intelligent agents working together to save lives.
          </p>
          <Link
            href="/auth/login"
            className="btn-primary text-lg px-8 py-3 inline-flex items-center space-x-2"
          >
            <span>Get Started Now</span>
            <Shield className="h-5 w-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">CrisisAssist</span>
            </div>
            <p className="text-gray-400 mb-4">
              Advanced Multi-Agent Emergency Response System - Powered by AI & Secure Communication
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>Powered by Descope</span>
              <span>•</span>
              <span>Multi-Agent Architecture</span>
              <span>•</span>
              <span>Real-time Coordination</span>
            </div>
          </div>
        </div>
      </footer>
      
    </div>
  );
}