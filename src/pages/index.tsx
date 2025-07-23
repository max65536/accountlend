import Head from 'next/head';
import { useState } from 'react';
import { Wallet, Shield, Clock, Users, ArrowRight, Plus, History } from 'lucide-react';
import WalletBar from '@/components/WalletBar';
import { StarknetProvider } from '@/components/starknet-provider';
import AccountMarket from '@/components/accountMarket';
import SessionKeyCreator from '@/components/SessionKeyCreator';
import SessionKeyManager from '@/components/SessionKeyManager';
import TransactionHistory from '@/components/TransactionHistory';
import NotificationCenter from '@/components/NotificationCenter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NetworkSwitcher } from '@/components/NetworkSwitcher';

function Home() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'create' | 'manage' | 'history'>('marketplace');

  const features = [
    {
      icon: Shield,
      title: "Secure Session Keys",
      description: "Advanced cryptographic security with time-limited access and action restrictions"
    },
    {
      icon: Clock,
      title: "Time-Limited Access",
      description: "Set custom expiration times and automatically revoke access when needed"
    },
    {
      icon: Users,
      title: "Decentralized Marketplace",
      description: "Trade session keys directly with other users in a trustless environment"
    }
  ];

  return (
    <StarknetProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Head>
          <title>AccountLend - Session Key Marketplace</title>
          <meta name="description" content="Rent and lend temporary account access through secure session keys on Starknet" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AccountLend
                </h1>
              </div>
              
              <nav className="hidden md:flex items-center space-x-6">
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Marketplace</a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">How it Works</a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Security</a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Help</a>
              </nav>

              <div className="flex items-center gap-4">
                <NetworkSwitcher />
                <NotificationCenter />
                <WalletBar />
              </div>
            </div>
          </div>
        </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            🚀 Built on Starknet
          </Badge>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Rent & Lend Account Access
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Trade temporary, secure access to Starknet accounts through session keys. 
            Set custom permissions, time limits, and earn from your unused account access.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => {
                setActiveTab('marketplace');
                // Scroll to the main content section
                document.querySelector('section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Marketplace
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => {
                setActiveTab('create');
                // Scroll to the main content section
                document.querySelector('section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Create Session Key
              <Plus className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose AccountLend?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg p-1 shadow-sm border">
              <Button
                variant={activeTab === 'marketplace' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('marketplace')}
                className="rounded-md"
              >
                Marketplace
              </Button>
              <Button
                variant={activeTab === 'create' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('create')}
                className="rounded-md"
              >
                Create Session
              </Button>
              <Button
                variant={activeTab === 'manage' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('manage')}
                className="rounded-md"
              >
                Manage Keys
              </Button>
              <Button
                variant={activeTab === 'history' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('history')}
                className="rounded-md"
              >
                History
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-6xl mx-auto">
            {activeTab === 'marketplace' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Session Key Marketplace
                  </CardTitle>
                  <CardDescription>
                    Browse and rent temporary account access from other users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccountMarket />
                </CardContent>
              </Card>
            )}

            {activeTab === 'create' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Session Key
                  </CardTitle>
                  <CardDescription>
                    Generate a new session key to lend your account access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SessionKeyCreator />
                </CardContent>
              </Card>
            )}

            {activeTab === 'manage' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Manage Session Keys
                  </CardTitle>
                  <CardDescription>
                    View and manage your active session keys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SessionKeyManager />
                </CardContent>
              </Card>
            )}

            {activeTab === 'history' && (
              <TransactionHistory />
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">AccountLend</h3>
              </div>
              <p className="text-gray-400">
                Secure session key marketplace built on Starknet
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Marketplace</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Create Session</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 AccountLend. Built with ❤️ on Starknet.</p>
          </div>
        </div>
      </footer>
      </div>
    </StarknetProvider>
  );
}

export default Home;
