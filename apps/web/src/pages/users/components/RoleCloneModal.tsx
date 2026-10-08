import { CopyOutlined } from '@ant-design/icons';
import type { Role } from '@uims/shared-types';
import { App, Form, Input, Modal, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { rolesService } from '../../../services/roles.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { formRules, isValidationError } from '../../../utils/formValidators';

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
      message.success(`Role "${values.targetRoleName}" cloned successfully.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'clone role'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CopyOutlined style={{ color: '#1677ff' }} />
          Clone Role: {sourceRole?.name}
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Clone Role"
      destroyOnHidden
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

      <Form
        form={form}
        layout="vertical"
        validateTrigger={['onChange', 'onBlur']}
        scrollToFirstError={true}
      >
        <Form.Item
          name="targetRoleName"
          label="New Role Name"
          rules={[
            formRules.required('Role name'),
            formRules.stringRange('Role name', 2, 50),
          ]}
        >
          <Input placeholder="e.g. Senior IT Field Technician" autoFocus />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[formRules.maxString('Description', 255)]}
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
