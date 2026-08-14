import { Button, Divider, Form, Input, Switch, Tabs } from 'antd';
import PageContainer from '../../components/PageContainer';

export default function SettingsPage() {
  const items = [
    {
      key: 'general',
      label: 'General Settings',
      children: (
        <Form layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item label="Company Name">
            <Input defaultValue="Acme Corp" />
          </Form.Item>
          <Form.Item label="Support Email">
            <Input defaultValue="it-support@acmecorp.com" />
          </Form.Item>
          <Divider />
          <Form.Item label="Enable Email Notifications" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Button type="primary">Save Changes</Button>
        </Form>
      ),
    },
    {
      key: 'users',
      label: 'Users & Roles',
      children: <div>Role Management Interface</div>,
    },
    {
      key: 'system',
      label: 'System Maintenance',
      children: <div>System logs, backups, and maintenance tasks.</div>,
    },
  ];

  return (
    <PageContainer
      title="System Settings"
      breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Settings' }]}
    >
      <Tabs defaultActiveKey="general" items={items} />
    </PageContainer>
  );
}
