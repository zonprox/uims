import {
  Button,
  type ButtonProps,
  Drawer,
  type DrawerProps,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type React from 'react';

const { Text } = Typography;

export interface AppDrawerProps extends Omit<DrawerProps, 'title' | 'footer'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  tag?: React.ReactNode;
  extra?: React.ReactNode;

  // Footer properties
  footer?: React.ReactNode | false;
  footerActions?: React.ReactNode;
  footerExtra?: React.ReactNode;
  onOk?: () => void | Promise<void>;
  okText?: string;
  okLoading?: boolean;
  okDanger?: boolean;
  okDisabled?: boolean;
  okProps?: ButtonProps;
  onCancel?: () => void;
  cancelText?: string;
  cancelProps?: ButtonProps;
  hideFooter?: boolean;
}

export interface DrawerSectionProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  noCard?: boolean;
}

export const DrawerSection: React.FC<DrawerSectionProps> = ({
  title,
  extra,
  children,
  style,
  noCard = false,
}) => {
  const { token } = theme.useToken();

  return (
    <div style={{ marginBottom: 16, ...style }}>
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            minWidth: 0,
          }}
        >
          {title && (
            <Text
              strong
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: token.colorTextSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </Text>
          )}
          {extra && <div style={{ flexShrink: 0 }}>{extra}</div>}
        </div>
      )}
      {noCard ? (
        children
      ) : (
        <div
          style={{
            background: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            padding: 14,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const AppDrawer: React.FC<AppDrawerProps> & {
  Section: typeof DrawerSection;
} = ({
  title,
  subtitle,
  icon,
  tag,
  extra,
  footer,
  footerActions,
  footerExtra,
  onOk,
  okText = 'Save',
  okLoading = false,
  okDanger = false,
  okDisabled = false,
  okProps,
  onCancel,
  cancelText,
  cancelProps,
  hideFooter = false,
  open,
  onClose,
  children,
  size = 560,
  styles: customStyles,
  destroyOnHidden = true,
  ...restProps
}) => {
  const { token } = theme.useToken();

  const handleClose = onCancel || (onClose as () => void) || undefined;

  // Synchronized Header layout with zero text overflow
  const renderHeader = () => {
    if (!title && !subtitle && !icon) return null;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          minWidth: 0,
          paddingRight: 4,
        }}
      >
        {icon && (
          <span
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              fontSize: 18,
              color: token.colorPrimary,
            }}
          >
            {icon}
          </span>
        )}

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Tooltip title={typeof title === 'string' ? title : undefined}>
              <Text
                strong
                style={{
                  fontSize: 15,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  display: 'block',
                }}
              >
                {title}
              </Text>
            </Tooltip>
            {tag && <span style={{ flexShrink: 0, display: 'inline-flex' }}>{tag}</span>}
          </div>

          {subtitle && (
            <Tooltip title={typeof subtitle === 'string' ? subtitle : undefined}>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  marginTop: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {subtitle}
              </Text>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  // Synchronized Fixed Footer layout with concise button controls
  const renderFooter = () => {
    if (hideFooter || footer === false) return null;
    if (footer !== undefined) return footer;

    const defaultCancelLabel = onOk ? 'Cancel' : 'Close';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          width: '100%',
        }}
      >
        {footerExtra && <div style={{ marginRight: 'auto' }}>{footerExtra}</div>}
        {footerActions}
        {handleClose && (
          <Button onClick={handleClose} {...cancelProps}>
            {cancelText || defaultCancelLabel}
          </Button>
        )}
        {onOk && (
          <Button
            type="primary"
            onClick={onOk}
            loading={okLoading}
            danger={okDanger}
            disabled={okDisabled}
            {...okProps}
          >
            {okText}
          </Button>
        )}
      </div>
    );
  };

  type DrawerStyles = NonNullable<DrawerProps['styles']>;
  type DrawerStylesFn = (info: { props: DrawerProps }) => unknown;
  type DrawerStylesObj = Exclude<DrawerStyles, DrawerStylesFn>;
  const stylesObj = (typeof customStyles === 'function' ? undefined : customStyles) as
    | DrawerStylesObj
    | undefined;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={renderHeader()}
      extra={extra}
      footer={renderFooter()}
      destroyOnHidden={destroyOnHidden}
      size={size}
      styles={
        typeof customStyles === 'function'
          ? customStyles
          : {
              header: {
                padding: '14px 20px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                ...stylesObj?.header,
              },
              body: {
                padding: '20px',
                overflowY: 'auto',
                overflowX: 'hidden',
                ...stylesObj?.body,
              },
              footer: {
                padding: '12px 20px',
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                ...stylesObj?.footer,
              },
              wrapper: {
                maxWidth: '100vw',
                ...stylesObj?.wrapper,
              },
              ...stylesObj,
            }
      }
      {...restProps}
    >
      {children}
    </Drawer>
  );
};

AppDrawer.Section = DrawerSection;

export default AppDrawer;
