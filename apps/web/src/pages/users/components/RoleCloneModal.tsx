import { CopyOutlined } from '@ant-design/icons';
import type { Role } from '@uims/shared-types';
import { App, Form, Input, Modal, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { rolesService } from '../../../services/roles.service';

const { Text } = Typography;

interface RoleCloneModalProps {
  open: boolean;
  sourceRole: Role | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RoleCloneModal: React.FC<RoleCloneModalProps> = ({
  open,
  sourceRole,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sourceRole && open) {
      form.setFieldsValue({
        targetRoleName: `${sourceRole.name} (Copy)`,
        description: `Cloned from ${sourceRole.name} with identical permission baseline.`,
      });
    }
  }, [sourceRole, open, form]);

  const handleSubmit = async () => {
    if (!sourceRole) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      await rolesService.cloneRole(sourceRole.id, {
        targetRoleName: values.targetRoleName,
        description: values.description,
      });
      message.success(`Successfully duplicated role "${values.targetRoleName}".`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (errorObj?.errorFields) return;
      message.error(errorObj?.response?.data?.message || 'Failed to clone role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CopyOutlined style={{ color: '#1677ff' }} />
          Duplicate Role: {sourceRole?.name}
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Create Duplicate Role"
      destroyOnClose
    >
      <div style={{ marginBottom: 16, marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Creates a new custom role inheriting all{' '}
          <strong>
            {sourceRole?.permissionCount || sourceRole?.permissions?.length || 0} permissions
          </strong>{' '}
          from <strong>{sourceRole?.name}</strong>.
        </Text>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="targetRoleName"
          label="New Role Name"
          rules={[
            { required: true, message: 'Please enter new role name' },
            { min: 2, message: 'Role name must be at least 2 characters' },
            { max: 50, message: 'Role name cannot exceed 50 characters' },
          ]}
        >
          <Input placeholder="e.g. Senior IT Field Technician" autoFocus />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ max: 255, message: 'Description cannot exceed 255 characters' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Brief explanation of role authority and use case..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
