const mongoose = require('mongoose');

// Channel Bundle - A collection of Telegram channels sold as a subscription package
const channelBundleSchema = new mongoose.Schema({
  name: {
    type: String,
    // required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  customRoute: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-_]+$/, 'Custom route can only contain lowercase letters, numbers, hyphens, and underscores'],
    minlength: [3, 'Custom route must be at least 3 characters long'],
    maxlength: [50, 'Custom route must be less than 50 characters long'],
    index: true
  },
  image: {
    type: String // URL to stored image
  },
  channels: [{
    chatId: {
      type: String,
      required: true
    },
    chatTitle: {
      type: String
    },
    joinLink: {
      type: String // Bot-generated join request link
    },
    isActive: {
      type: Boolean,
      default: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Legacy fields - keep for backward compatibility
  telegramChatId: {
    type: String, // Legacy single channel support
    sparse: true
  },
  telegramChatType: {
    type: String,
    enum: ['channel'], // Only channels, no groups/supergroups
    default: 'channel'
  },
  telegramChatTitle: {
    type: String
  },
  telegramInviteLink: {
    type: String // Stored invite link for legacy single channel
  },
  botStatus: {
    type: String,
    enum: ['not_connected', 'connected', 'error'],
    default: 'not_connected'
  },
  botUsername: {
    type: String,
    default: 'Rigi_Robot'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'error'],
    default: 'pending'
  },
  subscriptionPlans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  }],
  addGST: {
    type: Boolean,
    default: false
  },
  faqs: [{
    question: String,
    answer: String
  }],
  // Customizable Page Content
  howItWorks: {
    title: {
      type: String,
      default: "How It Works"
    },
    description: {
      type: String,
      default: "Get started in 4 simple steps"
    },
    steps: [{
      id: Number,
      title: String,
      description: String,
      icon: {
        type: String,
        enum: ['payment', 'channels', 'community', 'learning'],
        default: 'payment'
      },
      status: {
        type: String,
        enum: ['completed', 'current', 'pending'],
        default: 'pending'
      }
    }]
  },
  contentSection: {
    hidden: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: "Premium Content"
    },
    subtitle: {
      type: String,
      default: "What You'll Get"
    },
    description: {
      type: String,
      default: "Access exclusive content and premium features designed for your success."
    },
    details: [{
      type: String
    }],
    expandedText: {
      type: String
    }
  },
  disclaimer: {
    hidden: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: "Disclaimer"
    },
    content: {
      type: String,
      default: `This channel bundle provides educational and informational content only. 
      
We do not guarantee any specific results or outcomes from the content provided in these channels.
      
Users must exercise their own judgment and discretion when acting on any information shared.
      
Past performance does not guarantee future results. All investments and decisions carry risk.
      
By subscribing, you agree to these terms and acknowledge that you understand the risks involved.`
    },
    learnMoreText: {
      type: String,
      default: "Learn more about our terms."
    },
    learnMoreLink: {
      type: String,
      default: "#"
    }
  },
  linkedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  // Feature toggles for testing and configuration
  featureToggles: {
    enableESign: {
      type: Boolean,
      default: true,
      description: "Toggle E-Sign requirement for this channel bundle"
    },
    enableKYC: {
      type: Boolean,
      default: true,
      description: "Toggle KYC verification requirement for this channel bundle"
    },
  },
  stats: {
    totalSubscribers: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    activeSubscriptions: {
      type: Number,
      default: 0
    }
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
channelBundleSchema.index({ status: 1 });
channelBundleSchema.index({ createdBy: 1 });
channelBundleSchema.index({ isDefault: 1 });
// customRoute index is defined in schema field directly

module.exports = mongoose.model('Group', channelBundleSchema);