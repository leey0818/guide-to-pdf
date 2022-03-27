import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Col, Input, message, Row, Select, Spin, Typography } from 'antd';
import ImageBox from './components/ImageBox';

function App() {
  const inputRef = useRef(null);
  const [url, setUrl] = useState('');
  const [langCode, setLangCode] = useState('KO');
  const [imageData, setImageData] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleChangeUrl = (evt: ChangeEvent<HTMLInputElement>) => {
    setUrl(evt.target.value);
  };

  const handleChangeLangCode = (value: string) => {
    setLangCode(value);
  };

  const handleClickPreview = useCallback(async () => {
    if (!url) {
      inputRef.current.focus();
      return;
    }

    setImageData('');
    setPreviewLoading(true);

    try {
      const data = { pageUrl: url, langCode };
      const result = await window.electron.previewImage(data);
      if (result.success) {
        setImageData(result.data);
      } else {
        message.error(result.data);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [url, langCode]);

  const handleClickStart = useCallback(async () => {
    if (!url) {
      inputRef.current.focus();
      return;
    }

    setImageData('');
    setLoading(true);
    setLoadingMessage('준비중...');

    try {
      const data = { pageUrl: url, langCode };
      const result = await window.electron.generatePDF(data);
      if (result.success) {
        setImageData('');
        message.success(`정상적으로 생성되었습니다. 아래 경로에 저장되었습니다. ${result.data}`, 5);
      } else {
        message.error(result.data);
      }
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [url, langCode]);

  useEffect(() => {
    window.electron.onProgress(function (evt, data) {
      if (data.status === 'collect') {
        setLoadingMessage(`${data.pageNo}번째 페이지 생성중...`);
        setImageData(data.pageImage);
      } else if (data.status === 'generate') {
        setLoadingMessage('PDF 파일 생성중...');
      }
    });
  }, []);

  return (
    <Row justify="center" style={{ marginTop: 30 }}>
      <Col xs={20}>
        <Typography.Title level={1}>Guide to PDF</Typography.Title>

        <Input.Group>
          <Row gutter={8}>
            <Col xs={20}>
              <Input
                placeholder="Input URL"
                ref={inputRef}
                value={url}
                onChange={handleChangeUrl}
              ></Input>
            </Col>
            <Col xs={4}>
              <Select value={langCode} onChange={handleChangeLangCode} style={{ width: '100%' }}>
                <Select.Option value="KO">KO</Select.Option>
                <Select.Option value="EN">EN</Select.Option>
              </Select>
            </Col>
          </Row>
        </Input.Group>

        <Row align="middle" gutter={10}>
          <Col>
            <Button.Group style={{ margin: '8px 0' }}>
              <Button type="primary" disabled={previewLoading} loading={loading} onClick={handleClickStart}>PDF 생성</Button>
              <Button type="primary" disabled={loading} loading={previewLoading} onClick={handleClickPreview}>미리보기</Button>
            </Button.Group>
          </Col>
          <Col>
            {loading && (
              <>
                <Spin size="small" /> {loadingMessage}
                <Button type="link" size="small">취소</Button>
              </>
            )}
          </Col>
        </Row>

        <ImageBox image={imageData}/>
      </Col>
    </Row>
  );
}

export default App;
