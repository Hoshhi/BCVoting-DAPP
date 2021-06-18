import React from "react";
import { ReactComponent as MetamaskFox } from "./svg/metamask-fox.svg";
import SvgIcon from "@material-ui/core/SvgIcon";

const MetaMaskIcon = (props) => (
    <SvgIcon {...props}>
        <MetamaskFox />
    </SvgIcon>
);

export default MetaMaskIcon