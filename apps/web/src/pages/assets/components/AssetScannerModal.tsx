import {
  CameraOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  QrcodeOutlined,
  SearchOutlined,
  SwapOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Flex,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  type DecodedQrResult,
  type ExtendedMediaTrackCapabilities,
  type ExtendedMediaTrackConstraintSet,
  decodeQrFromImageFile,
  decodeQrFromVideoFrame,
  parseAssetQrPayload,
} from '../utils/qrDecoder';

const { Text } = Typography;

export type ScannerStatus = 'idle' | 'scanning' | 'detected' | 'processing' | 'error';

export interface AssetScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (tag: string) => Promise<void> | void;
  onRegisterAsset?: (prefilledTag: string) => void;
}

export const AssetScannerModal: React.FC<AssetScannerModalProps> = React.memo(
  ({ open, onClose, onScanSuccess, onRegisterAsset }) => {
    const { message, notification } = App.useApp();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isProcessingRef = useRef<boolean>(false);
    const isOpenRef = useRef<boolean>(open);
    const activeCameraRequestIdRef = useRef<number>(0);
    const selectedDeviceIdRef = useRef<string>('');

    isOpenRef.current = open;

    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [devices, setDevices] = useState<Array<MediaDeviceInfo>>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [torchSupported, setTorchSupported] = useState<boolean>(false);
    const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
    const [manualTag, setManualTag] = useState<string>('');
    const [detectedTag, setDetectedTag] = useState<string | null>(null);

    // Stop and cleanly release all media stream tracks
    const stopStream = useCallback(() => {
      activeCameraRequestIdRef.current++;
      isProcessingRef.current = false;
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause?.();
          videoRef.current.srcObject = null;
          videoRef.current.load?.();
        } catch (_cleanupErr: unknown) {
          // Media stream release fallback
        }
      }
      setDetectedTag(null);
      setTorchEnabled(false);
      setTorchSupported(false);
    }, []);

    // Start video stream targeting rear camera by default with fallback
    const startCamera = useCallback(async (deviceId?: string) => {
      const requestId = ++activeCameraRequestIdRef.current;
      isProcessingRef.current = false;
      setCameraError(null);
      setStatus('scanning');
      setDetectedTag(null);

      // Stop prior tracks before requesting a new device stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause?.();
          videoRef.current.srcObject = null;
          videoRef.current.load?.();
        } catch (_resetErr: unknown) {
          // Reset fallback
        }
      }
      setTorchEnabled(false);
      setTorchSupported(false);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        const errorMsg =
          'Camera access is unavailable in this environment. Please use manual entry or file upload.';
        setCameraError(errorMsg);
        setStatus('error');
        notification.error({
          message: 'Camera Unavailable',
          description: errorMsg,
          placement: 'topRight',
          duration: 5,
        });
        return;
      }

      try {
        const constraints: MediaStreamConstraints = deviceId
          ? { video: { deviceId: { exact: deviceId } } }
          : {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            };

        let stream: MediaStream;
        let usedRequestedDevice = Boolean(deviceId);
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (_constraintErr: unknown) {
          // Fallback to default video device if environmental constraints fail
          usedRequestedDevice = false;
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        // Cancel if modal closed or newer request initiated while getUserMedia was pending
        if (!isOpenRef.current || requestId !== activeCameraRequestIdRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          const video = videoRef.current;
          try {
            video.srcObject = stream;
            video.muted = true;
          } catch (_srcErr: unknown) {
            // Browser/environment srcObject constraint fallback
          }

          const playVideo = () => {
            if (!isOpenRef.current || requestId !== activeCameraRequestIdRef.current) return;
            try {
              const playPromise = video.play?.();
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch((_playErr: unknown) => {
                  setTimeout(() => {
                    if (isOpenRef.current && videoRef.current && videoRef.current.paused) {
                      videoRef.current.play?.()?.catch?.((_retryErr: unknown) => {
                        // Handled: video autoplay policy retry failure
                      });
                    }
                  }, 120);
                });
              }
            } catch (_policyErr: unknown) {
              // Video play policy fallback
            }
          };

          if (video.readyState >= 1) {
            playVideo();
          } else {
            video.onloadedmetadata = () => {
              playVideo();
            };
          }
        }

        // Check for torch / flashlight capabilities
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const caps = track.getCapabilities() as ExtendedMediaTrackCapabilities;
          setTorchSupported(Boolean(caps?.torch));
        } else {
          setTorchSupported(false);
        }

        // Enumerate available video inputs
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          if (!isOpenRef.current || requestId !== activeCameraRequestIdRef.current) return;
          const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
          setDevices(videoInputs);
          const activeDeviceId = usedRequestedDevice
            ? deviceId || track?.getSettings?.()?.deviceId || videoInputs[0]?.deviceId || ''
            : track?.getSettings?.()?.deviceId || deviceId || videoInputs[0]?.deviceId || '';
          if (activeDeviceId) {
            selectedDeviceIdRef.current = activeDeviceId;
            setSelectedDeviceId(activeDeviceId);
          }
        } catch (_deviceErr: unknown) {
          // Enumerate devices not permitted or supported
        }
      } catch (err: unknown) {
        if (!isOpenRef.current || requestId !== activeCameraRequestIdRef.current) return;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        const messageText =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. You can manually enter an asset tag or upload an image file.'
            : err instanceof Error && err.name === 'NotFoundError'
              ? 'No camera device found on this system. Use manual entry or upload an image.'
              : err instanceof Error
                ? err.message
                : 'Unable to start camera stream.';
        setCameraError(messageText);
        setStatus('error');
        notification.error({
          message: 'Camera Access Denied',
          description: messageText,
          placement: 'topRight',
          duration: 5,
        });
      }
    }, []);

    // Toggle torch/flashlight if supported
    const toggleTorch = useCallback(async () => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || !torchSupported) return;

      try {
        const nextTorch = !torchEnabled;
        const advancedConstraints: ExtendedMediaTrackConstraintSet = { torch: nextTorch };
        await track.applyConstraints({
          advanced: [advancedConstraints as MediaTrackConstraintSet],
        });
        setTorchEnabled(nextTorch);
      } catch (_torchErr: unknown) {
        message.warning('Unable to toggle flashlight on this camera device.');
      }
    }, [torchEnabled, torchSupported, message]);

    // Switch camera device
    const handleDeviceChange = useCallback(
      (deviceId: string) => {
        selectedDeviceIdRef.current = deviceId;
        setSelectedDeviceId(deviceId);
        startCamera(deviceId);
      },
      [startCamera],
    );

    // Cycle to next available camera
    const handleSwitchNextCamera = useCallback(() => {
      if (devices.length < 2) return;
      const currentId = selectedDeviceIdRef.current || selectedDeviceId;
      const currentIndex = devices.findIndex((d) => d.deviceId === currentId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDevice = devices[nextIndex];
      if (nextDevice) {
        handleDeviceChange(nextDevice.deviceId);
      }
    }, [devices, selectedDeviceId, handleDeviceChange]);

    // Continuous scanning loop (throttled interval for energy efficiency and responsiveness)
    useEffect(() => {
      if (!open || status !== 'scanning') return;

      const scanTick = async () => {
        if (!videoRef.current || isProcessingRef.current || !isOpenRef.current) return;

        if (videoRef.current.paused) {
          try {
            videoRef.current.play?.()?.catch?.((_autoplayErr: unknown) => {
              // Non-fatal: autoplay policy restriction during active scan loop
            });
          } catch (_playErr: unknown) {
            // Ignore autoplay error
          }
        }

        if (videoRef.current.readyState >= 2) {
          try {
            const result = await decodeQrFromVideoFrame(
              videoRef.current,
              canvasRef.current || undefined,
            );
            if (result && result.parsedTag && isOpenRef.current) {
              isProcessingRef.current = true;
              setDetectedTag(result.parsedTag);
              setStatus('detected');

              // Short delay to allow visual feedback before processing
              feedbackTimerRef.current = setTimeout(async () => {
                if (!isOpenRef.current) {
                  isProcessingRef.current = false;
                  return;
                }
                setStatus('processing');
                try {
                  await onScanSuccess(result.parsedTag);
                } catch (_scanErr: unknown) {
                  // Scanning callback error handled by caller
                } finally {
                  isProcessingRef.current = false;
                  if (isOpenRef.current) {
                    setStatus('scanning');
                    setDetectedTag(null);
                  }
                }
              }, 250);
            }
          } catch (_decodeErr: unknown) {
            // Frame decoding error, continue loop
          }
        }
      };

      scanTimerRef.current = setInterval(scanTick, 180);

      return () => {
        if (scanTimerRef.current) {
          clearInterval(scanTimerRef.current);
          scanTimerRef.current = null;
        }
      };
    }, [open, status, onScanSuccess]);

    // Modal lifecycle: start stream on open, release tracks on close
    useEffect(() => {
      isOpenRef.current = open;
      if (open) {
        isProcessingRef.current = false;
        setManualTag('');
        startCamera();
      } else {
        stopStream();
        setStatus('idle');
      }

      return () => {
        isOpenRef.current = false;
        stopStream();
      };
    }, [open, startCamera, stopStream]);

    // Manual asset tag lookup
    const handleManualLookup = useCallback(async () => {
      const trimmed = manualTag.trim();
      if (!trimmed) {
        message.warning('Please enter an asset tag or identifier.');
        return;
      }
      const parsed = parseAssetQrPayload(trimmed);
      if (!parsed) {
        message.warning('No valid asset tag found in the provided input.');
        return;
      }
      setStatus('processing');
      try {
        await onScanSuccess(parsed);
      } catch (_lookupErr: unknown) {
        // Handled by onScanSuccess / caller
      } finally {
        if (isOpenRef.current) {
          setStatus(cameraError ? 'error' : 'scanning');
        }
      }
    }, [cameraError, manualTag, message, onScanSuccess]);

    // Image file upload fallback
    const handleImageUpload = useCallback(
      async (file: File) => {
        setStatus('processing');
        let result: DecodedQrResult | null = null;
        try {
          result = await decodeQrFromImageFile(file);
        } catch (uploadErr: unknown) {
          message.error(
            uploadErr instanceof Error ? uploadErr.message : 'Failed to decode uploaded image.',
          );
          if (isOpenRef.current) {
            setStatus(cameraError ? 'error' : 'scanning');
          }
          return false;
        }

        if (result && result.parsedTag) {
          try {
            await onScanSuccess(result.parsedTag);
          } catch (_uploadScanErr: unknown) {
            // Handled by caller
          } finally {
            if (isOpenRef.current) {
              setStatus(cameraError ? 'error' : 'scanning');
            }
          }
        } else {
          message.warning(
            result && result.rawValue
              ? 'The detected QR code does not contain a valid asset identifier.'
              : 'No valid QR code was detected in the uploaded image.',
          );
          if (isOpenRef.current) {
            setStatus(cameraError ? 'error' : 'scanning');
          }
        }
        return false;
      },
      [cameraError, message, onScanSuccess],
    );

    const reticleColor =
      status === 'detected'
        ? '#faad14'
        : status === 'processing'
          ? '#52c41a'
          : status === 'error'
            ? '#ff4d4f'
            : '#1677ff';

    return (
      <Modal
        title={
          <Flex align="center" gap={8}>
            <QrcodeOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <span>Scan Asset QR Code</span>
          </Flex>
        }
        open={open}
        destroyOnHidden
        onCancel={onClose}
        width={480}
        centered
        styles={{
          body: {
            padding: '16px 20px',
          },
        }}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ]}
      >
        <style>{`
          @keyframes uimsLaserSweep {
            0% { top: 6px; opacity: 0.9; }
            50% { opacity: 1; }
            100% { top: calc(100% - 8px); opacity: 0.9; }
          }
          .uims-scanner-laser {
            position: absolute;
            left: 4px;
            right: 4px;
            height: 3px;
            background: linear-gradient(90deg, transparent, #1677ff 25%, #52c41a 50%, #1677ff 75%, transparent);
            box-shadow: 0 0 10px 2px rgba(22, 119, 255, 0.75);
            animation: uimsLaserSweep 2s ease-in-out infinite alternate;
          }
        `}</style>

        {cameraError ? (
          <Alert
            type="warning"
            showIcon
            title="Camera Access Unavailable"
            description={cameraError}
            style={{ marginBottom: 16 }}
          />
        ) : (
          /* Live Camera Viewfinder */
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 280,
              backgroundColor: '#090d16',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Visual Scanning Reticle */}
            <div
              style={{
                position: 'absolute',
                width: 200,
                height: 200,
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }}
            >
              {/* Corner Targets */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 28,
                  height: 28,
                  borderTop: `3px solid ${reticleColor}`,
                  borderLeft: `3px solid ${reticleColor}`,
                  borderTopLeftRadius: 6,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderTop: `3px solid ${reticleColor}`,
                  borderRight: `3px solid ${reticleColor}`,
                  borderTopRightRadius: 6,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 28,
                  height: 28,
                  borderBottom: `3px solid ${reticleColor}`,
                  borderLeft: `3px solid ${reticleColor}`,
                  borderBottomLeftRadius: 6,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderBottom: `3px solid ${reticleColor}`,
                  borderRight: `3px solid ${reticleColor}`,
                  borderBottomRightRadius: 6,
                }}
              />

              {/* Active Laser Sweep Animation */}
              {status === 'scanning' && <div className="uims-scanner-laser" />}
            </div>

            {/* Status Indicators */}
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              {status === 'scanning' && (
                <Tag color="processing" icon={<SyncOutlined spin />}>
                  Scanning...
                </Tag>
              )}
              {status === 'detected' && (
                <Tag color="warning" icon={<CheckCircleOutlined />}>
                  Asset Detected: {detectedTag}
                </Tag>
              )}
              {status === 'processing' && (
                <Tag color="success" icon={<LoadingOutlined />}>
                  Processing
                </Tag>
              )}
            </div>

            {/* Helper Caption */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                textAlign: 'center',
                width: '100%',
              }}
            >
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: 12,
                  textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                }}
              >
                Center asset QR code within reticle frame
              </Text>
            </div>
          </div>
        )}

        {/* Device Controls & Upload Bar */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={8}
          style={{ marginBottom: 16 }}
        >
          <Space size={6} wrap>
            {devices.length > 1 && (
              <>
                <Select
                  size="small"
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  style={{ width: 140 }}
                  placeholder="Select Camera"
                  options={devices.map((d, index) => ({
                    label: d.label || `Camera ${index + 1}`,
                    value: d.deviceId,
                  }))}
                />
                <Tooltip title="Switch Camera">
                  <Button size="small" icon={<SwapOutlined />} onClick={handleSwitchNextCamera} />
                </Tooltip>
              </>
            )}

            {torchSupported && (
              <Button
                size="small"
                type={torchEnabled ? 'primary' : 'default'}
                icon={<ThunderboltOutlined />}
                onClick={toggleTorch}
              >
                {torchEnabled ? 'Flashlight On' : 'Flashlight Off'}
              </Button>
            )}

            {cameraError && (
              <Button
                size="small"
                icon={<CameraOutlined />}
                onClick={() => startCamera(selectedDeviceId || undefined)}
              >
                Retry Camera
              </Button>
            )}
          </Space>

          <Upload accept="image/*" showUploadList={false} beforeUpload={handleImageUpload}>
            <Button size="small" icon={<UploadOutlined />}>
              Upload QR Image
            </Button>
          </Upload>
        </Flex>

        {/* Manual Asset Tag Input Fallback */}
        <div style={{ paddingTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Manual Asset Tag or URL Lookup:
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="e.g. AST-2026-0042 or https://uims.internal/assets/AST-1001"
              value={manualTag}
              onChange={(e) => setManualTag(e.target.value)}
              onPressEnter={handleManualLookup}
              allowClear
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleManualLookup}
              loading={status === 'processing'}
            >
              Lookup Asset
            </Button>
            {onRegisterAsset && (
              <Tooltip title="Register new asset with entered tag">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const trimmed = manualTag.trim();
                    if (!trimmed) {
                      message.warning('Please enter an asset tag or identifier.');
                      return;
                    }
                    const parsed = parseAssetQrPayload(trimmed);
                    if (!parsed) {
                      message.warning('No valid asset tag found in the provided input.');
                      return;
                    }
                    onClose();
                    onRegisterAsset(parsed);
                  }}
                >
                  Register
                </Button>
              </Tooltip>
            )}
          </Space.Compact>
        </div>
      </Modal>
    );
  },
);

AssetScannerModal.displayName = 'AssetScannerModal';
