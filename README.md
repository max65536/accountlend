# AccountLend - Session Key Marketplace on Starknet

A decentralized marketplace built on Starknet that enables users to lend and rent temporary account access through session keys. This innovative platform allows account owners to monetize their accounts while providing renters with secure, time-limited access to specific functionalities.

## 🌟 Features

### Core Functionality
- **Session Key Marketplace**: Create, list, and rent session keys with customizable permissions
- **Secure Account Lending**: Temporary account access without sharing private keys
- **Flexible Pricing**: Set custom rental rates and durations
- **Multi-Wallet Support**: Compatible with Argent and Braavos wallets
- **Real-time Updates**: Live marketplace data with automatic synchronization

### Advanced Features
- **Batch Operations**: Efficient bulk session key management
- **Transaction History**: Complete audit trail of all marketplace activities
- **Network Switching**: Seamless switching between Starknet networks
- **Emergency Controls**: Instant session key revocation and marketplace pausing
- **Comprehensive Testing**: Full end-to-end test coverage with security audits

## 🚀 Live Demo

**Production App**: [https://accountlend.vercel.app/](https://accountlend.vercel.app/)

Try the live marketplace to experience session key lending and renting on Starknet testnet.

## 🏗️ Architecture

### Smart Contracts (Cairo)
- **SessionKeyMarketplace**: Core marketplace logic for listing and renting
- **SessionKeyManager**: Advanced session key lifecycle management
- **Security Features**: Built-in access controls and emergency mechanisms

### Frontend (Next.js + TypeScript)
- **React Components**: Modular, reusable UI components
- **Starknet Integration**: Native wallet connectivity and contract interactions
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **State Management**: Efficient caching and background synchronization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Yarn
- Starknet wallet (Argent or Braavos)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/max65536/accountlend.git
cd accountlend

# Install dependencies
yarn install

# Start development server
yarn dev
```

Visit `http://localhost:3000` to access the application.

### Environment Setup

Create a `.env.local` file:
```env
NEXT_PUBLIC_STARKNET_NETWORK=testnet
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0x...
NEXT_PUBLIC_SESSION_MANAGER_CONTRACT=0x...
```

## 📋 Usage Guide

### For Account Owners (Lenders)
1. **Connect Wallet**: Use Argent or Braavos wallet
2. **Create Session Key**: Set permissions, expiration time, and action limits
3. **List on Marketplace**: Set rental price and duration
4. **Manage Rentals**: Monitor active rentals and earnings
5. **Emergency Control**: Cancel session keys at any time for security

### For Renters
1. **Browse Marketplace**: View available session keys with different permissions
2. **Rent Access**: Pay rental fee to gain temporary limited control
3. **Use Permissions**: Execute allowed operations within time and action limits
4. **Automatic Expiry**: Access automatically revokes after rental period

### Key Security Features
- **Limited Actions**: Sellers can exclude specific actions (e.g., transfers)
- **Time Limits**: All session keys have configurable expiration times
- **Instant Cancellation**: Sellers can revoke access immediately if needed
- **Permission Control**: Fine-grained control over what renters can do

## 🧪 Testing

### Run Test Suite
```bash
# Unit tests
yarn test

# End-to-end tests
yarn test:e2e

# Security audit
yarn test:security

# Complete workflow test
yarn test:workflow
```

### Test Coverage
- ✅ Wallet connection and network switching
- ✅ Session key creation and management
- ✅ Marketplace listing and rental
- ✅ Payment processing and escrow
- ✅ Security controls and emergency procedures
- ✅ Cross-browser compatibility

## 🔧 Development

### Project Structure
```
accountlend/
├── contract/                 # Cairo smart contracts
│   └── lendaccount/
│       ├── src/
│       │   ├── lib.cairo            # Main contract
│       │   ├── marketplace.cairo    # Marketplace logic
│       │   └── session_key_manager.cairo
│       └── tests/
├── src/
│   ├── components/          # React components
│   │   ├── accountMarket.tsx       # Main marketplace UI
│   │   ├── SessionKeyManager.tsx   # Session key management
│   │   └── WalletBar.tsx          # Wallet connection
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   └── pages/              # Next.js pages
├── tests/                  # Test files
└── docs/                   # Documentation
```

### Key Technologies
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Blockchain**: Starknet, Cairo 2.0, Starknet.js
- **Testing**: Jest, Playwright, Custom security audits
- **Development**: ESLint, Prettier, Husky pre-commit hooks

### Development Workflow
1. Check `development_progress.md` for current status
2. Create feature branch from `main`
3. Implement changes with tests
4. Update progress tracking
5. Submit pull request with documentation

## 🚀 Deployment

### Testnet Deployment
```bash
# Deploy contracts to Starknet testnet
cd contract/lendaccount
scarb build
starkli deploy target/dev/lendaccount_SessionKeyMarketplace.contract_class.json

# Deploy frontend to Vercel
vercel --prod
```

### Production Checklist
- [ ] Smart contracts audited and deployed to mainnet
- [ ] Frontend deployed with production contract addresses
- [ ] All tests passing
- [ ] Security review completed
- [ ] Performance optimization verified
- [ ] Monitoring and alerting configured

## 📊 Current Status

### Completed Features ✅
- Core marketplace functionality
- Session key management system
- Multi-wallet integration (Argent & Braavos)
- Comprehensive testing suite
- Security audit framework
- Production deployment pipeline
- Live demo application

### In Progress 🚧
- Advanced session key policies
- Mobile app optimization
- Gas optimization improvements
- Enhanced user analytics

### Planned Features 📋
- Cross-chain compatibility
- Advanced permission templates
- Automated rental renewals
- Reputation system for lenders

## 🔒 Security

### Security Features
- **Session Key Isolation**: Each session key has limited, specific permissions
- **Time-based Expiration**: Automatic access revocation
- **Action Limitations**: Exclude specific operations (transfers, approvals, etc.)
- **Emergency Controls**: Instant marketplace pause and session revocation
- **Audit Trail**: Complete transaction history and logging
- **Smart Contract Security**: Comprehensive access controls and validation

### Security Benefits
- **No Private Key Sharing**: Renters never access the actual private keys
- **Granular Control**: Precise permission management for each session
- **Immediate Revocation**: Sellers maintain full control and can cancel anytime
- **Limited Exposure**: Time and action limits minimize potential risks

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Follow the development guidelines in `.clinerules`
4. Submit a pull request with comprehensive tests

### Development Guidelines
- Use TypeScript for all new code
- Add tests for new functionality
- Update documentation
- Follow Cairo best practices for smart contracts
- Maintain security standards

### Code Quality
- ESLint and Prettier for code formatting
- Comprehensive test coverage required
- Security review for all smart contract changes
- Performance testing for UI components

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Wallet Testing Guide](WALLET_TESTING_GUIDE.md) - Wallet integration testing
- [Session Key Testing Guide](SESSION_KEY_TESTING_GUIDE.md) - Session key functionality testing
- [Contract Testing Guide](contract/lendaccount/CONTRACT_TESTING_GUIDE.md) - Smart contract testing
- [Development Progress](development_progress.md) - Current project status

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Issues**
```bash
# Clear browser cache and reconnect wallet
# Ensure correct network is selected
# Check wallet extension is updated
```

**Contract Interaction Failures**
```bash
# Verify contract addresses in config
# Check network connectivity
# Ensure sufficient gas fees
```

**Development Server Issues**
```bash
# Clear Next.js cache
rm -rf .next
yarn dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Starknet team for the robust blockchain infrastructure
- Argent and Braavos for wallet integration support
- Open source community for various tools and libraries

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/max65536/accountlend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/max65536/accountlend/discussions)
- **Documentation**: [Project Wiki](https://github.com/max65536/accountlend/wiki)

---

**Built with ❤️ on Starknet**

*AccountLend is pioneering the future of decentralized account access management. Join us in building a more flexible and secure blockchain ecosystem.*
