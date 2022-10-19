import { useMemo } from "react";
import styled from "styled-components";

export const SphericalProgress = styled(
  ({
    className,
    progress,
    style,
  }: {
    className?: string;
    progress: number;
    style?: Object;
    frontColor?: string;
    backgroundColor?: string;
  }) => {
    const number = useMemo(
      () => `${Math.floor(Math.min(progress, 1) * 10000) / 100}%`,
      [progress]
    );

    return (
      <div className={className} style={style}>
        <div className="num">{number}</div>
        <div className="wave" />
        <div className="wave-mask" />
      </div>
    );
  }
)`
  position: relative;
  display: inline-block;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #ffffff;
  overflow: hidden;

  .wave {
    position: relative;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(
      -180deg,
      ${(props) => (props.frontColor ? props.frontColor : "rgb(0, 196, 204)")}
        13%,
      ${(props) => (props.frontColor ? props.frontColor : "rgb(0, 196, 204)")}
        100%
    );
    border-radius: 50%;
  }

  .wave-mask {
    position: absolute;
    width: 200%;
    height: 200%;
    top: ${(props) => `${100 - props.progress * 100}%`};
    left: 50%;
    border-radius: 40%;
    transform: translate(-50%, -101%) rotate(0);
    animation: spin 30s linear infinite;
    z-index: 20;
    background-color: ${(props) =>
      props.backgroundColor ? props.backgroundColor : "rgb(52, 53, 54)"};
  }

  .num {
    position: absolute;
    width: 100%;
    height: 100%;
    color: #fff;
    font-size: 16px;
    line-height: 100px;
    font-weight: bold;
    text-align: center;
    z-index: 100;
  }

  @keyframes spin {
    50% {
      transform: translate(-50%, -101%) rotate(500deg);
    }
    100% {
      transform: translate(-50%, -101%) rotate(1000deg);
    }
  }
`;
