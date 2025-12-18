import { Modal, Typography, Button, Space, Card, Tag, List } from 'antd';
import { CrownOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Title, Text, Paragraph } = Typography;

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PricingModal = ({ open, onClose, onUpgrade }: PricingModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      onUpgrade();
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = {
    free: [
      { text: 'Up to 3 notes', included: true },
      { text: 'Basic note editing', included: true },
      { text: 'Share links (view only)', included: true },
      { text: 'Unlimited notes', included: false },
      { text: 'Real-time collaboration', included: false },
      { text: 'Team sharing (specific users)', included: false },
      { text: 'Priority support', included: false },
    ],
    premium: [
      { text: 'Unlimited notes', included: true },
      { text: 'Real-time collaboration', included: true },
      { text: 'Share with edit permissions', included: true },
      { text: 'Team sharing (specific users)', included: true },
      { text: 'Cursor tracking', included: true },
      { text: 'Priority support', included: true },
      { text: 'Early access to new features', included: true },
    ],
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={800} centered>
      <Space orientation="vertical" size="large" style={{ width: '100%', padding: '20px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <CrownOutlined style={{ fontSize: '48px', color: '#faad14' }} />
          <Title level={2} style={{ marginTop: '16px', marginBottom: '8px' }}>
            Upgrade to Premium
          </Title>
          <Paragraph type="secondary">Unlock unlimited notes and premium features</Paragraph>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
            marginTop: '24px',
          }}
        >
          {/* Free Plan */}
          <Card hoverable style={{ borderRadius: '12px' }}>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Title level={4}>Free</Title>
                <Title level={2} style={{ margin: '8px 0' }}>
                  $0
                  <Text type="secondary" style={{ fontSize: '16px', fontWeight: 'normal' }}>
                    /month
                  </Text>
                </Title>
              </div>

              <List
                size="small"
                dataSource={features.free}
                renderItem={(item) => (
                  <List.Item style={{ border: 'none', padding: '8px 0' }}>
                    <Space>
                      {item.included ? (
                        <CheckOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseOutlined style={{ color: '#d9d9d9' }} />
                      )}
                      <Text type={item.included ? undefined : 'secondary'}>{item.text}</Text>
                    </Space>
                  </List.Item>
                )}
              />

              <Button block disabled>
                Current Plan
              </Button>
            </Space>
          </Card>

          {/* Premium Plan */}
          <Card
            hoverable
            style={{
              borderRadius: '12px',
              border: '2px solid #1890ff',
              position: 'relative',
            }}
          >
            <Tag
              color="blue"
              style={{
                position: 'absolute',
                top: '-12px',
                right: '20px',
                fontSize: '12px',
                padding: '4px 12px',
              }}
            >
              RECOMMENDED
            </Tag>

            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Title level={4}>
                  Premium <CrownOutlined style={{ color: '#faad14' }} />
                </Title>
                <Title level={2} style={{ margin: '8px 0' }}>
                  $3
                  <Text type="secondary" style={{ fontSize: '16px', fontWeight: 'normal' }}>
                    /month
                  </Text>
                </Title>
              </div>

              <List
                size="small"
                dataSource={features.premium}
                renderItem={(item) => (
                  <List.Item style={{ border: 'none', padding: '8px 0' }}>
                    <Space>
                      <CheckOutlined style={{ color: '#52c41a' }} />
                      <Text>{item.text}</Text>
                    </Space>
                  </List.Item>
                )}
              />

              <Button
                type="primary"
                size="large"
                block
                icon={<CrownOutlined />}
                onClick={handleUpgrade}
                loading={loading}
              >
                Upgrade Now
              </Button>
            </Space>
          </Card>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Secure payment powered by Stripe • Cancel anytime
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default PricingModal;
