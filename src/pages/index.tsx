import Head from 'next/head';
import { useState } from 'react';
import { Wallet, Shield, Clock, Users, ArrowRight, Plus, History } from 'lucide-react';
import { StarknetProvider } from '@/components/starknet-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { WalletBarSkeleton, NetworkSwitcherSkeleton, NotificationCenterSkeleton } from '@/components/WalletSkeleton';

// 使用 dynamic import 加载钱包相关组件
const WalletBar = dynamic(() => import('@/components/WalletBar'), {
  ssr: false,
  loading: () => <WalletBarSkeleton />
});

const NetworkSwitcher = dynamic(() => import('@/components/NetworkSwitcher').then(mod => ({ default: mod.NetworkSwitcher })), {
  ssr: false,
  loading: () => <NetworkSwitcherSkeleton />
});

const NotificationCenter = dynamic(() => import('@/components/NotificationCenter'), {
  ssr: false,
  loading: () => <NotificationCenterSkeleton />
});

// 其他组件也可以使用 dynamic import，但不是必须的
const AccountMarket = dynamic(() => import('@/components/accountMarket'), {
  ssr: false
});

const SessionKeyCreator = dynamic(() => import('@/components/SessionKeyCreator'), {
  ssr: false
});

const SessionKeyManager = dynamic(() => import('@/components/SessionKeyManager'), {
  ssr: false
});

const TransactionHistory = dynamic(() => import('@/components/TransactionHistory'), {
  ssr: false
});

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
                <button 
                  onClick={() => {
                    setActiveTab('marketplace');
                    document.querySelector('section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Marketplace
                </button>
                <button 
                  onClick={() => {
                    document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  How it Works
                </button>
                <button 
                  onClick={() => {
                    document.querySelector('#security')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Security
                </button>
                <button 
                  onClick={() => {
                    document.querySelector('#help')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Help
                </button>
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

      {/* How it Works Section */}
      <section id="how-it-works" className="py-16 px-4 bg-white/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">How AccountLend Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <CardTitle>1. Create Session Key</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Set up a session key with custom permissions, duration, and pricing. Define what actions renters can perform with your account.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle>2. List on Marketplace</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Your session key appears in the marketplace where other users can browse, compare features, and rent access to your account.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
                <CardTitle>3. Earn & Manage</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Earn STRK/ETH when users rent your session keys. Monitor usage, revoke access anytime, and manage all your active sessions.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <h4 className="text-xl font-semibold mb-4">For Renters</h4>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Browse the marketplace to find session keys that match your needs. Pay with STRK or ETH to gain temporary access to accounts with specific permissions for gaming, DeFi, NFTs, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Security & Trust</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Session Key Technology
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="font-semibold mb-2">Time-Limited Access</h5>
                  <p className="text-gray-600">Session keys automatically expire after the set duration. No manual revocation needed.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Permission-Based Control</h5>
                  <p className="text-gray-600">Define exactly what actions renters can perform - transfers, swaps, gaming, NFTs, or custom combinations.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Cryptographic Security</h5>
                  <p className="text-gray-600">Built on Starknet's Account Abstraction with Argent's proven session key implementation.</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Risk Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="font-semibold mb-2">Emergency Revocation</h5>
                  <p className="text-gray-600">Instantly revoke any active session key if you detect suspicious activity or change your mind.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Spending Limits</h5>
                  <p className="text-gray-600">Set maximum spending limits per session to protect your assets from excessive usage.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Activity Monitoring</h5>
                  <p className="text-gray-600">Track all transactions made with your session keys in real-time through the dashboard.</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 bg-blue-50 p-6 rounded-lg">
            <h4 className="text-xl font-semibold mb-4 text-center">Security Best Practices</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">Only grant necessary permissions for the intended use case</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">Set reasonable time limits - shorter is generally safer</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">Monitor your session keys regularly through the dashboard</span>
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">Keep your main account secure with strong authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">Revoke sessions immediately if you suspect misuse</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">Start with small amounts to test new renters</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section id="help" className="py-16 px-4 bg-white/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Help & Support</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="font-semibold mb-2">Connect Your Wallet</h5>
                  <p className="text-gray-600">Install Argent X or Braavos wallet and connect to Starknet Sepolia testnet for testing.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Get Test Tokens</h5>
                  <p className="text-gray-600">Visit the <a href="https://faucet.starknet.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Starknet Faucet</a> to get STRK tokens for testing.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Create Your First Session</h5>
                  <p className="text-gray-600">Use the "Create Session" tab to set up your first session key with basic permissions.</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="font-semibold mb-2">Wallet Connection Issues</h5>
                  <p className="text-gray-600">Make sure you're on Starknet Sepolia testnet and refresh the page if connection fails.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Transaction Failures</h5>
                  <p className="text-gray-600">Ensure you have sufficient STRK tokens for transaction fees. Check your balance in the wallet.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Session Key Not Working</h5>
                  <p className="text-gray-600">Verify the session hasn't expired and has the correct permissions for your intended actions.</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <h4 className="text-xl font-semibold mb-4">Need More Help?</h4>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg">
                📖 View Documentation
              </Button>
              <Button variant="outline" size="lg">
                💬 Join Discord
              </Button>
              <Button variant="outline" size="lg">
                🐛 Report Bug
              </Button>
            </div>
            <p className="text-gray-600 mt-4">
              For technical support, check our comprehensive testing guides: 
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded ml-1">WALLET_TESTING_GUIDE.md</span>
            </p>
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
