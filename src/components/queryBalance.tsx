"use client";
import { useAccount, useBalance } from "@starknet-react/core";

export default function Balance() {
    const { address } = useAccount();
    const dicimals = 1e18;
    const { isLoading, isError, error, data } = useBalance({
        address,
        watch: true
    })

    if (isLoading) return <div>Loading ...</div>;
    if (isError || !data) return <div>{error?.message}</div>;
    return <div>{(Number(data.value) / dicimals).toString()}{data.symbol}</div>
}