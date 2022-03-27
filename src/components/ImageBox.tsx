import styled from 'styled-components';

const ImageWrap = styled.div`
  /* margin: auto; */
  width: 100%;
  max-width: 680px;
  border: 1px solid #dfdfdf;
  img {
    width: 100%;
  }
`;

type ImageBoxProps = {
  image: string | null;
};

function ImageBox(props: ImageBoxProps) {
  return (
    <div>
      {props.image &&
        <ImageWrap>
          <img alt="Preview" src={props.image} />
        </ImageWrap>
      }
    </div>
  )
}

export default ImageBox;
